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
  if (costs.length === 0) return [];

  const totals = new Map<string, number>();
  for (const cost of costs) {
    const month = cost.costDate.slice(0, 7);
    totals.set(month, (totals.get(month) ?? 0) + cost.amountCents);
  }

  const months = [...totals.keys()].sort();
  const result: MonthSpend[] = [];
  const cursor = new Date(`${months[0]}-01T00:00:00Z`);
  const last = months[months.length - 1];

  while (cursor.toISOString().slice(0, 7) <= last) {
    const month = cursor.toISOString().slice(0, 7);
    result.push({ month, spentCents: totals.get(month) ?? 0 });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return result;
}
