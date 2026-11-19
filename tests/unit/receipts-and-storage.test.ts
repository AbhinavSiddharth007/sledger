import { describe, expect, it } from "vitest";
import { CONFIDENCE_THRESHOLD, validateReceipt, type Receipt } from "@/lib/receipts/schema";

const receipt: Receipt = {
  supplier: "Materiales Hermanos Ruiz S.L.",
  date: "2025-02-03",
  line_items: [
    { description: "Perfiles", qty: 2, unit_price_cents: 500, total_cents: 1000 },
    { description: "Placas", qty: 1, unit_price_cents: 280, total_cents: 280 },
  ],
  subtotal_cents: 1280,
  vat_cents: 269,
  total_cents: 1549,
  category: "materials",
  confidence: 0.95,
};

describe("validateReceipt", () => {
  it("passes a receipt whose arithmetic adds up", () => {
    expect(validateReceipt(receipt)).toEqual({ issues: [], needsReview: false });
  });

  it("flags line items that do not sum to the subtotal", () => {
    const result = validateReceipt({ ...receipt, subtotal_cents: 1500 });
    expect(result.needsReview).toBe(true);
    expect(result.issues.join(" ")).toContain("Line items sum to 1280");
  });

  it("flags a total that is not subtotal plus VAT", () => {
    const result = validateReceipt({ ...receipt, total_cents: 1500 });
    expect(result.needsReview).toBe(true);
  });

  it("flags a malformed date", () => {
    expect(validateReceipt({ ...receipt, date: "03/02/2025" }).issues[0]).toContain("YYYY-MM-DD");
  });

  it("flags confidence below the threshold", () => {
    const result = validateReceipt({ ...receipt, confidence: CONFIDENCE_THRESHOLD - 0.1 });
    expect(result.needsReview).toBe(true);
  });
});
