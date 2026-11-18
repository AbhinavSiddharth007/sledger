import { z } from "zod";
import { COST_CATEGORIES, COST_STATUSES } from "@/lib/format";

// Accepts "1234", "1234.5" or "1234,50". Users type euros; we store cents.
const euroAmount = z
  .string()
  .trim()
  .regex(/^\d+([.,]\d{1,2})?$/, "Enter an amount like 1234.56");

const toCents = (amount: string) => Math.round(Number(amount.replace(",", ".")) * 100);

export const uuidSchema = z.uuid();

export const responseSchema = z.object({
  projectId: uuidSchema,
  message: z.string().trim().min(1, "Message is required").max(1000),
});

export const costSchema = z
  .object({
    category: z.enum(COST_CATEGORIES, { error: "Choose a category" }),
    supplier: z.string().trim().min(1, "Supplier is required").max(200),
    description: z.string().trim().min(1, "Description is required").max(500),
    amount: euroAmount,
    vat: euroAmount.or(z.literal("")),
    costDate: z.iso.date("Enter a valid date"),
    status: z.enum(COST_STATUSES, { error: "Choose a status" }),
  })
  .transform((data) => ({
    category: data.category,
    supplier: data.supplier,
    description: data.description,
    amountCents: toCents(data.amount),
    vatCents: data.vat === "" ? 0 : toCents(data.vat),
    costDate: data.costDate,
    status: data.status,
  }));

export type CostInput = z.output<typeof costSchema>;

export const invoiceSchema = z
  .object({
    amount: euroAmount,
    issuedAt: z.iso.date("Enter a valid issue date"),
    dueAt: z.iso.date("Enter a valid due date"),
  })
  .refine((data) => data.dueAt >= data.issuedAt, {
    message: "The due date cannot be before the issue date",
    path: ["dueAt"],
  })
  .transform((data) => ({
    amountCents: toCents(data.amount),
    issuedAt: data.issuedAt,
    dueAt: data.dueAt,
  }));

export type InvoiceInput = z.output<typeof invoiceSchema>;
