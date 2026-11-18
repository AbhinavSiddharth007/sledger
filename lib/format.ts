const euro = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

// Money is stored as integer cents.
export const formatCents = (cents: number) => euro.format(cents / 100);

// "2025-03" becomes "March 2025". Works on the UTC month, so no time zone shifts it.
export const formatMonth = (yearMonth: string) =>
  new Date(`${yearMonth}-01T00:00:00Z`).toLocaleDateString("en-IE", { month: "long", year: "numeric", timeZone: "UTC" });

export const COST_CATEGORIES = ["materials", "labour", "subcontractor", "other"] as const;
export const COST_STATUSES = ["confirmed", "needs_review"] as const;
export const PROJECT_STATUSES = ["active", "completed"] as const;
