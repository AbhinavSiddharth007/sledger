import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { receiptSchema, type Receipt } from "@/lib/receipts/schema";

export const EXTRACTION_MODEL = "claude-opus-5-5";
export const MAX_RETRIES = 2;

const PROMPT = `Extract the data from this supplier receipt, invoice, or delivery note (albarán, factura, DDT, scontrino).
- Amounts are integer cents in EUR. 12,50 € is 1250.
- Use the document's own figures; do not recompute them.
- Dates are YYYY-MM-DD.
- Set confidence to how sure you are that every field was read correctly.`;

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
  const fileBlock =
    input.mediaType === "application/pdf"
      ? { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 } }
      : { type: "image" as const, source: { type: "base64" as const, media_type: input.mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: base64 } };

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const response = await client.messages.parse({
        model: EXTRACTION_MODEL,
        max_tokens: 8000,
        output_config: { effort: "medium", format: zodOutputFormat(receiptSchema) },
        messages: [{ role: "user", content: [fileBlock, { type: "text", text: PROMPT }] }],
      });

      const text = response.content
        .flatMap((block) => (block.type === "text" ? [block.text] : []))
        .join("\n");
      const record = { attempt, stopReason: response.stop_reason, text };

      if (response.parsed_output) {
        attempts.push(record);
        return { ok: true, receipt: response.parsed_output, attempts };
      }

      attempts.push({ ...record, error: "Model output did not match the receipt schema." });
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
