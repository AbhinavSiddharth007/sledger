const STYLES: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800",
  needs_review: "bg-amber-100 text-amber-800",
  active: "bg-blue-100 text-blue-800",
  completed: "bg-zinc-200 text-zinc-700",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs whitespace-nowrap ${STYLES[status] ?? ""}`}>
      {status.replace("_", " ")}
    </span>
  );
}
