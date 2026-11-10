const euro = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

// Money is stored as integer cents.
export const formatCents = (cents: number) => euro.format(cents / 100);

export const COST_CATEGORIES = ["materials", "labour", "subcontractor", "other"] as const;
export const COST_STATUSES = ["confirmed", "needs_review"] as const;
export const PROJECT_STATUSES = ["active", "completed"] as const;
