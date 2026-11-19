import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { receiptSchema, type Receipt } from "@/lib/receipts/schema";

export const EXTRACTION_MODEL = "claude-opus-5-5";
export const RECORD_COSTS = "record_costs";
export const MAX_RETRIES = 2;

const PROMPT = `Extract the data from this supplier receipt, invoice, or delivery note (albarán, factura, DDT, scontrino).
- Amounts are integer cents in EUR. 12,50 € is 1250.
- Use the document's own figures; do not recompute them.
- Dates are YYYY-MM-DD.
- Set confidence to how sure you are that every field was read correctly.
- Record the result by calling the ${RECORD_COSTS} tool once.`;

// The tool's input schema is generated from the same Zod schema that validates the answer, so
// the model is asked for exactly the shape that is checked on the way back.
const recordCostsTool: Anthropic.Tool = {
  name: RECORD_COSTS,
  description: "Record the costs read from one supplier receipt, invoice or delivery note.",
  input_schema: z.toJSONSchema(receiptSchema) as Anthropic.Tool.InputSchema,
};

export type ExtractionAttempt = {
  attempt: number;
  stopReason: string | null;
  text: string;
  error?: string;
};

export type ExtractionResult =
  | { ok: true; receipt: Receipt; attempts: ExtractionAttempt[] }
  | { ok: false; error: string; attempts: ExtractionAttempt[] };

export type ExtractionInput = {
  data: Buffer;
  mediaType: string;
};

export type ParseResult = { ok: true; receipt: Receipt } | { ok: false; error: string };

// Reads the record_costs call out of a model response and checks it with the Zod schema. Pure, so it
// can be tested without the API. A response that skips the tool, or whose input does not match, fails.
export function parseRecordCosts(content: Anthropic.ContentBlock[]): ParseResult {
  const call = content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === RECORD_COSTS,
  );
  if (!call) {
    return { ok: false, error: `The model did not call ${RECORD_COSTS}.` };
  }

  const parsed = receiptSchema.safeParse(call.input);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`);
    return { ok: false, error: `The ${RECORD_COSTS} input did not match the receipt schema. ${issues.join("; ")}` };
  }
  return { ok: true, receipt: parsed.data };
}

// The client sets maxRetries to 0 so this loop is the only retry layer.
export function createExtractionClient() {
  return new Anthropic({ maxRetries: 0 });
}

export async function extractReceipt(
  client: Anthropic,
  input: ExtractionInput,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((done) => setTimeout(done, ms)),
): Promise<ExtractionResult> {
  const attempts: ExtractionAttempt[] = [];
  const base64 = input.data.toString("base64");
  // PDFs go in as a document block, images as an image block. The bytes are never stored in the
  // database, only the path in storage.
  const fileBlock: Anthropic.ContentBlockParam =
    input.mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : {
          type: "image",
          source: {
            type: "base64",
            media_type: input.mediaType as "image/jpeg" | "image/png" | "image/webp",
            data: base64,
          },
        };

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const response = await client.messages.create({
        model: EXTRACTION_MODEL,
        max_tokens: 8000,
        tools: [recordCostsTool],
        tool_choice: { type: "tool", name: RECORD_COSTS },
        messages: [{ role: "user", content: [fileBlock, { type: "text", text: PROMPT }] }],
      });

      const text = response.content
        .flatMap((block) => (block.type === "text" ? [block.text] : []))
        .join("\n");
      const record = { attempt, stopReason: response.stop_reason, text };
      const parsed = parseRecordCosts(response.content);

      if (parsed.ok) {
        attempts.push(record);
        return { ok: true, receipt: parsed.receipt, attempts };
      }

      attempts.push({ ...record, error: parsed.error });
    } catch (error) {
      if (!isRetryable(error)) {
        const message = error instanceof Error ? error.message : String(error);
        attempts.push({ attempt, stopReason: null, text: "", error: message });
        return { ok: false, error: message, attempts };
      }
      attempts.push({
        attempt,
        stopReason: null,
        text: "",
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (attempt <= MAX_RETRIES) await sleep(1000 * 2 ** (attempt - 1));
  }

  const last = attempts[attempts.length - 1];
  return { ok: false, error: last?.error ?? "Extraction failed.", attempts };
}

// Rate limits, server errors, network failures and schema mismatches are worth retrying.
// Bad requests, auth failures and oversized files are not.
// Checks the status field rather than instanceof, so it also works when the SDK is loaded twice (ESM and CJS).
function isRetryable(error: unknown): boolean {
  if (error instanceof Anthropic.APIConnectionError) return true;
  const status = (error as { status?: unknown } | null)?.status;
  if (typeof status !== "number") return false;
  return status === 429 || status >= 500;
}
