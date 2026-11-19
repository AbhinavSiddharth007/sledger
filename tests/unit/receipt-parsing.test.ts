import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { MAX_RETRIES, RECORD_COSTS, extractReceipt, parseRecordCosts } from "@/lib/receipts/extract";

// A receipt the model might return through the record_costs tool.
const validInput = {
  supplier: "Ferretería E2E",
  date: "2025-03-14",
  line_items: [{ description: "Tornillos", qty: 2, unit_price_cents: 500, total_cents: 1000 }],
  subtotal_cents: 1000,
  vat_cents: 210,
  total_cents: 1210,
  category: "materials",
  confidence: 0.95,
};

const toolUse = (input: unknown, name = RECORD_COSTS) =>
  ({ type: "tool_use", id: "toolu_1", name, input, caller: { type: "direct" } }) as unknown as Anthropic.ContentBlock;
const text = (value: string) => ({ type: "text", text: value, citations: null }) as unknown as Anthropic.ContentBlock;
const message = (content: Anthropic.ContentBlock[]) => ({ content, stop_reason: "tool_use" }) as unknown as Anthropic.Message;

function fakeClient(responses: (Anthropic.Message | Error)[]) {
  let call = 0;
  // The request is recorded by the mock, so tests can inspect it.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const create = vi.fn(async (_request: unknown) => {
    const next = responses[call++];
    if (next instanceof Error) throw next;
    return next;
  });
  return { client: { messages: { create } } as unknown as Anthropic, create };
}

const noSleep = async () => {};
const statusError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });
const file = { data: Buffer.from("fake-bytes"), mediaType: "image/png" };

describe("parseRecordCosts", () => {
  it("accepts a record_costs call whose input matches the receipt schema", () => {
    const result = parseRecordCosts([toolUse(validInput)]);

    expect(result).toEqual({ ok: true, receipt: validInput });
  });

  it("ignores text blocks around the tool call", () => {
    const result = parseRecordCosts([text("Here is the receipt."), toolUse(validInput)]);

    expect(result.ok).toBe(true);
  });

  it("fails when the model answers in text and never calls the tool", () => {
    const result = parseRecordCosts([text("The total is 12,10 €.")]);

    expect(result).toEqual({ ok: false, error: "The model did not call record_costs." });
  });

  it("fails when the model calls some other tool", () => {
    const result = parseRecordCosts([toolUse(validInput, "something_else")]);

    expect(result.ok).toBe(false);
  });

  it("fails and names the field when the input breaks the schema", () => {
    const result = parseRecordCosts([toolUse({ ...validInput, total_cents: "1210" })]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("total_cents");
  });

  it("fails when a required field is missing", () => {
    const withoutSupplier: Partial<typeof validInput> = { ...validInput };
    delete withoutSupplier.supplier;
    const result = parseRecordCosts([toolUse(withoutSupplier)]);

    expect(result.ok).toBe(false);
  });
});

describe("extractReceipt", () => {
  it("forces the record_costs tool, and sends the Zod-generated schema as its input schema", async () => {
    const { client, create } = fakeClient([message([toolUse(validInput)])]);

    await extractReceipt(client, file, noSleep);

    const request = create.mock.calls[0][0] as unknown as {
      tools: { name: string; input_schema: { type: string } }[];
      tool_choice: { type: string; name: string };
    };
    expect(request.tools[0].name).toBe(RECORD_COSTS);
    expect(request.tools[0].input_schema.type).toBe("object");
    expect(request.tool_choice).toEqual({ type: "tool", name: RECORD_COSTS });
  });

  it("sends a PDF as a document block and an image as an image block", async () => {
    const pdf = fakeClient([message([toolUse(validInput)])]);
    const png = fakeClient([message([toolUse(validInput)])]);

    await extractReceipt(pdf.client, { data: Buffer.from("%PDF"), mediaType: "application/pdf" }, noSleep);
    await extractReceipt(png.client, file, noSleep);

    const firstBlock = (create: { mock: { calls: unknown[][] } }) =>
      (create.mock.calls[0][0] as unknown as { messages: { content: { type: string }[] }[] }).messages[0].content[0].type;
    expect(firstBlock(pdf.create)).toBe("document");
    expect(firstBlock(png.create)).toBe("image");
  });

  it("returns the receipt on the first good answer", async () => {
    const { client, create } = fakeClient([message([toolUse(validInput)])]);

    const result = await extractReceipt(client, file, noSleep);

    expect(result.ok).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("retries a rate limit, waiting between attempts, and then succeeds", async () => {
    const { client, create } = fakeClient([statusError(429), message([toolUse(validInput)])]);
    const sleep = vi.fn(async () => {});

    const result = await extractReceipt(client, file, sleep);

    expect(result.ok).toBe(true);
    expect(create).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1000);
    expect(result.attempts).toHaveLength(2);
  });

  it("does not retry a bad request", async () => {
    const { client, create } = fakeClient([statusError(400)]);

    const result = await extractReceipt(client, file, noSleep);

    expect(result.ok).toBe(false);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("retries a bad answer up to the limit, then gives up with the last error", async () => {
    const bad = message([text("no tool call")]);
    const { client, create } = fakeClient(Array.from({ length: MAX_RETRIES + 1 }, () => bad));

    const result = await extractReceipt(client, file, noSleep);

    expect(result.ok).toBe(false);
    expect(create).toHaveBeenCalledTimes(MAX_RETRIES + 1);
    if (!result.ok) expect(result.error).toContain("did not call record_costs");
  });
});
