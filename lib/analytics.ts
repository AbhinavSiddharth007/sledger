import { COST_CATEGORIES } from "@/lib/format";

export type CostForSpend = { category: string; amountCents: number; costDate: string };

export type CategorySpend = { category: string; spentCents: number };
export type MonthSpend = { month: string; spentCents: number };

// Every category appears, even with nothing spent, so the chart keeps the same bars.
export function spendByCategory(costs: CostForSpend[]): CategorySpend[] {
  return COST_CATEGORIES.map((category) => ({
    category,
    spentCents: costs
      .filter((cost) => cost.category === category)
      .reduce((sum, cost) => sum + cost.amountCents, 0),
  }));
}

// One entry per calendar month from the first cost to the last, so a month with no spend shows
// as zero rather than disappearing from the line.
export function spendByMonth(costs: CostForSpend[]): MonthSpend[] {
  const totals = monthTotals(costs.map((cost) => ({ date: cost.costDate, cents: cost.amountCents })));
  return monthsBetween(totals).map((month) => ({ month, spentCents: totals.get(month) ?? 0 }));
}

// Totals per calendar month ("YYYY-MM"), from dated amounts.
export function monthTotals(entries: { date: string; cents: number }[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    const month = entry.date.slice(0, 7);
    totals.set(month, (totals.get(month) ?? 0) + entry.cents);
  }
  return totals;
}

// Every month from the earliest to the latest in the map, so a month with nothing still appears.
export function monthsBetween(totals: Map<string, number>): string[] {
  if (totals.size === 0) return [];
  const months = [...totals.keys()].sort();
  const result: string[] = [];
  const cursor = new Date(`${months[0]}-01T00:00:00Z`);
  const last = months[months.length - 1];
  while (cursor.toISOString().slice(0, 7) <= last) {
    result.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return result;
}
