import { z } from "zod";
import { COST_CATEGORIES } from "@/lib/format";

export const CONFIDENCE_THRESHOLD = 0.8;

export const receiptSchema = z.object({
  supplier: z.string(),
  date: z.string().describe("Document date as YYYY-MM-DD"),
  line_items: z.array(
    z.object({
      description: z.string(),
      qty: z.number(),
      unit_price_cents: z.number().int(),
      total_cents: z.number().int(),
    }),
  ),
  subtotal_cents: z.number().int().describe("Net total before VAT, in cents"),
  vat_cents: z.number().int(),
  total_cents: z.number().int().describe("Gross total including VAT, in cents"),
  category: z.enum(COST_CATEGORIES),
  confidence: z.number().describe("Your confidence in the extraction, 0 to 1"),
});

export type Receipt = z.infer<typeof receiptSchema>;

export type ReceiptValidation = {
  issues: string[];
  needsReview: boolean;
};

// Checks the arithmetic on the model's output. Money is compared in integer cents.
export function validateReceipt(receipt: Receipt): ReceiptValidation {
  const issues: string[] = [];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(receipt.date)) {
    issues.push(`Date "${receipt.date}" is not in YYYY-MM-DD format.`);
  }

  const lineTotal = receipt.line_items.reduce((sum, item) => sum + item.total_cents, 0);
  if (Math.abs(lineTotal - receipt.subtotal_cents) > 1) {
    issues.push(
      `Line items sum to ${lineTotal} cents but subtotal is ${receipt.subtotal_cents}.`,
    );
  }

  if (receipt.subtotal_cents + receipt.vat_cents !== receipt.total_cents) {
    issues.push(
      `Subtotal ${receipt.subtotal_cents} + VAT ${receipt.vat_cents} does not equal total ${receipt.total_cents}.`,
    );
  }

  if (receipt.confidence < CONFIDENCE_THRESHOLD) {
    issues.push(`Confidence ${receipt.confidence} is below ${CONFIDENCE_THRESHOLD}.`);
  }

  return { issues, needsReview: issues.length > 0 };
}
