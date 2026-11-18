import { monthsBetween, monthTotals } from "@/lib/analytics";

// All amounts are net, before VAT, in integer cents, the same as costs.

export type InvoiceAmount = { amountCents: number; status: string };
export type CostAmount = { amountCents: number; status: string; costDate: string };
export type PaidInvoice = { amountCents: number; paidAt: string | null };

// Invoiced means sent to the client: every invoice except drafts. Overdue is still invoiced.
export function invoicedCents(invoices: InvoiceAmount[]): number {
  return sum(invoices.filter((invoice) => invoice.status !== "draft"));
}

export function paidCents(invoices: InvoiceAmount[]): number {
  return sum(invoices.filter((invoice) => invoice.status === "paid"));
}

// What the client still owes: invoiced, less paid.
export function outstandingCents(invoices: InvoiceAmount[]): number {
  return invoicedCents(invoices) - paidCents(invoices);
}

// Only confirmed costs count. A cost waiting for review is not yet money out.
export function confirmedCostCents(costs: CostAmount[]): number {
  return sum(costs.filter((cost) => cost.status === "confirmed"));
}

// Margin is what was invoiced, less the confirmed costs. It can be negative.
export function marginCents(invoices: InvoiceAmount[], costs: CostAmount[]): number {
  return invoicedCents(invoices) - confirmedCostCents(costs);
}

export type CashFlowMonth = {
  month: string;
  inCents: number;
  outCents: number;
  netCents: number;
  cumulativeCents: number;
};

// Money in is paid invoices, dated by when they were paid. Money out is confirmed costs, dated by
// the cost date. Every month between the first and the last movement appears, with zeros where
// nothing moved, and the running balance carries forward.
export function cashFlowByMonth(paid: PaidInvoice[], costs: CostAmount[]): CashFlowMonth[] {
  const moneyIn = monthTotals(
    paid.flatMap((invoice) => (invoice.paidAt ? [{ date: invoice.paidAt, cents: invoice.amountCents }] : [])),
  );
  const moneyOut = monthTotals(
    costs
      .filter((cost) => cost.status === "confirmed")
      .map((cost) => ({ date: cost.costDate, cents: cost.amountCents })),
  );

  let cumulative = 0;
  return monthsBetween(new Map([...moneyIn, ...moneyOut])).map((month) => {
    const inCents = moneyIn.get(month) ?? 0;
    const outCents = moneyOut.get(month) ?? 0;
    cumulative += inCents - outCents;
    return { month, inCents, outCents, netCents: inCents - outCents, cumulativeCents: cumulative };
  });
}

function sum<T extends { amountCents: number }>(items: T[]): number {
  return items.reduce((total, item) => total + item.amountCents, 0);
}
