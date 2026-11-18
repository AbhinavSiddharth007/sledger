const STYLES: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800",
  needs_review: "bg-amber-100 text-amber-800",
  active: "bg-blue-100 text-blue-800",
  completed: "bg-zinc-200 text-zinc-700",
  pending: "bg-zinc-100 text-zinc-700",
  extracted: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  draft: "bg-zinc-100 text-zinc-700",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs whitespace-nowrap ${STYLES[status] ?? ""}`}>
      {status.replace("_", " ")}
    </span>
  );
}
