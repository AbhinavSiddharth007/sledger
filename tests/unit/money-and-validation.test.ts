import { describe, expect, it } from "vitest";
import { formatCents } from "@/lib/format";
import { costSchema } from "@/lib/validations";

const validCost = {
  category: "materials",
  supplier: "Cerámicas Levante",
  description: "Azulejo baño",
  amount: "1234,5",
  vat: "",
  costDate: "2025-02-10",
  status: "confirmed",
};

describe("formatCents", () => {
  it("formats integer cents as euros", () => {
    expect(formatCents(128040)).toContain("1,280.40");
  });
});

describe("costSchema", () => {
  it("converts euro input to integer cents", () => {
    const parsed = costSchema.parse(validCost);
    expect(parsed.amountCents).toBe(123450);
    expect(Number.isInteger(parsed.amountCents)).toBe(true);
  });

  it("treats an empty VAT field as zero", () => {
    expect(costSchema.parse(validCost).vatCents).toBe(0);
  });

  it("converts a VAT amount to cents", () => {
    expect(costSchema.parse({ ...validCost, vat: "259,35" }).vatCents).toBe(25935);
  });

  it("rejects amounts with more than two decimal places", () => {
    expect(costSchema.safeParse({ ...validCost, amount: "12.345" }).success).toBe(false);
  });

  it("rejects unknown categories", () => {
    expect(costSchema.safeParse({ ...validCost, category: "snacks" }).success).toBe(false);
  });
});
