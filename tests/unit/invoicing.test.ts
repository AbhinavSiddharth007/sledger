import { describe, expect, it } from "vitest";
import {
  cashFlowByMonth,
  confirmedCostCents,
  invoicedCents,
  marginCents,
  outstandingCents,
  paidCents,
} from "@/lib/invoicing";

const invoices = [
  { amountCents: 100_000, status: "draft" },
  { amountCents: 200_000, status: "sent" },
  { amountCents: 50_000, status: "overdue" },
  { amountCents: 300_000, status: "paid" },
];
const costs = [
  { amountCents: 120_000, status: "confirmed", costDate: "2025-01-10" },
  { amountCents: 40_000, status: "needs_review", costDate: "2025-01-12" },
  { amountCents: 60_000, status: "confirmed", costDate: "2025-03-01" },
];

describe("invoice totals", () => {
  it("count everything except drafts as invoiced", () => {
    expect(invoicedCents(invoices)).toBe(550_000);
  });

  it("count paid invoices as paid", () => {
    expect(paidCents(invoices)).toBe(300_000);
  });

  it("count invoiced less paid as outstanding, including overdue", () => {
    expect(outstandingCents(invoices)).toBe(250_000);
  });
});

describe("margin", () => {
  it("is invoiced less confirmed costs, leaving out costs awaiting review", () => {
    expect(confirmedCostCents(costs)).toBe(180_000);
    expect(marginCents(invoices, costs)).toBe(550_000 - 180_000);
  });

  it("can be negative when costs exceed what was invoiced", () => {
    expect(marginCents([{ amountCents: 10_000, status: "sent" }], costs)).toBe(10_000 - 180_000);
  });

  it("is zero for an empty project", () => {
    expect(marginCents([], [])).toBe(0);
  });
});

describe("cash flow", () => {
  it("returns nothing when there is no money movement", () => {
    expect(cashFlowByMonth([], [])).toEqual([]);
  });

  it("puts paid invoices in by payment month and confirmed costs out by cost month", () => {
    const result = cashFlowByMonth(
      [{ amountCents: 300_000, paidAt: "2025-02-20" }],
      costs,
    );

    expect(result).toEqual([
      { month: "2025-01", inCents: 0, outCents: 120_000, netCents: -120_000, cumulativeCents: -120_000 },
      { month: "2025-02", inCents: 300_000, outCents: 0, netCents: 300_000, cumulativeCents: 180_000 },
      { month: "2025-03", inCents: 0, outCents: 60_000, netCents: -60_000, cumulativeCents: 120_000 },
    ]);
  });

  it("ignores a paid invoice with no payment date", () => {
    const result = cashFlowByMonth([{ amountCents: 1000, paidAt: null }], []);

    expect(result).toEqual([]);
  });
});
