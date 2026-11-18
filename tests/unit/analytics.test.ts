import { describe, expect, it } from "vitest";
import { spendByCategory, spendByMonth } from "@/lib/analytics";

const cost = (category: string, amountCents: number, costDate: string) => ({ category, amountCents, costDate });

describe("spendByCategory", () => {
  it("totals each category and keeps empty ones at zero", () => {
    const result = spendByCategory([cost("materials", 1000, "2025-01-01"), cost("materials", 250, "2025-02-01")]);

    expect(result).toEqual([
      { category: "materials", spentCents: 1250 },
      { category: "labour", spentCents: 0 },
      { category: "subcontractor", spentCents: 0 },
      { category: "other", spentCents: 0 },
    ]);
  });
});

describe("spendByMonth", () => {
  it("returns nothing when there are no costs", () => {
    expect(spendByMonth([])).toEqual([]);
  });

  it("fills months with no spend between the first and last cost", () => {
    const result = spendByMonth([
      cost("labour", 100, "2025-01-15"),
      cost("labour", 200, "2025-01-30"),
      cost("labour", 50, "2025-03-02"),
    ]);

    expect(result).toEqual([
      { month: "2025-01", spentCents: 300 },
      { month: "2025-02", spentCents: 0 },
      { month: "2025-03", spentCents: 50 },
    ]);
  });

  it("crosses a year boundary", () => {
    const result = spendByMonth([cost("other", 1, "2024-11-05"), cost("other", 1, "2025-01-05")]);

    expect(result.map((row) => row.month)).toEqual(["2024-11", "2024-12", "2025-01"]);
  });
});
