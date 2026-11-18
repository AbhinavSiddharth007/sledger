"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { COST_CATEGORIES, COST_STATUSES, formatCents } from "@/lib/format";
import type { Cost } from "@/lib/queries";

// Filters and sorting live in the URL (category, status, q, sort, dir), so a view can be
// bookmarked and survives a reload. The rows come from the server and are filtered here.

const SORT_KEYS = ["costDate", "supplier", "category", "amountCents", "status"] as const;
type SortKey = (typeof SORT_KEYS)[number];

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";
const FIELD = `rounded border border-zinc-300 px-3 py-2 ${FOCUS}`;

export function CostsTable({ projectId, costs }: { projectId: string; costs: Cost[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const category = params.get("category") ?? "";
  const status = params.get("status") ?? "";
  const query = params.get("q") ?? "";
  const sortParam = params.get("sort") as SortKey | null;
  const sort: SortKey = sortParam && (SORT_KEYS as readonly string[]).includes(sortParam) ? sortParam : "costDate";
  const direction = params.get("dir") === "asc" ? "asc" : "desc";

  const update = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      const search = next.toString();
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  // The search box keeps its own text, and writes to the URL once typing pauses.
  const [search, setSearch] = useState(query);
  useEffect(() => {
    if (search === query) return;
    const timer = setTimeout(() => update({ q: search.trim() || null }), 250);
    return () => clearTimeout(timer);
  }, [search, query, update]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = costs.filter(
      (cost) =>
        (!category || cost.category === category) &&
        (!status || cost.status === status) &&
        (!needle || cost.supplier.toLowerCase().includes(needle)),
    );
    const sign = direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => sign * compare(a, b, sort));
  }, [costs, category, status, query, sort, direction]);

  function toggleSort(key: SortKey) {
    if (sort === key) {
      update({ dir: direction === "asc" ? "desc" : "asc" });
    } else {
      update({ sort: key, dir: key === "costDate" || key === "amountCents" ? "desc" : "asc" });
    }
  }

  function clearFilters() {
    setSearch("");
    update({ category: null, status: null, q: null });
  }

  if (costs.length === 0) {
    return <p className="text-zinc-500">No costs yet.</p>;
  }

  const filtersApplied = Boolean(category || status || query);

  return (
    <div className="grid gap-4">
      <form role="search" className="grid gap-3 sm:flex sm:flex-wrap sm:items-end" onSubmit={(event) => event.preventDefault()}>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Category</span>
          <select className={FIELD} value={category} onChange={(event) => update({ category: event.target.value || null })}>
            <option value="">All categories</option>
            {COST_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">Status</span>
          <select className={FIELD} value={status} onChange={(event) => update({ status: event.target.value || null })}>
            <option value="">All statuses</option>
            {COST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm sm:min-w-64">
          <span className="font-medium">Supplier</span>
          <input
            type="search"
            className={FIELD}
            placeholder="Search by supplier"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        {filtersApplied && (
          <button type="button" onClick={clearFilters} className={`rounded border px-3 py-2 text-sm ${FOCUS}`}>
            Clear filters
          </button>
        )}
      </form>

      <p role="status" aria-live="polite" className="text-sm text-zinc-500">
        Showing {visible.length} of {costs.length} costs
      </p>

      {visible.length === 0 ? (
        <p className="text-zinc-500">No costs match these filters.</p>
      ) : (
        <div className="relative min-w-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Costs for this project. Select a column heading to sort.</caption>
            <thead className="border-b text-zinc-500">
              <tr>
                <SortableHeader label="Date" sortKey="costDate" active={sort} direction={direction} onSort={toggleSort} />
                <SortableHeader label="Category" sortKey="category" active={sort} direction={direction} onSort={toggleSort} />
                <SortableHeader label="Supplier" sortKey="supplier" active={sort} direction={direction} onSort={toggleSort} />
                <th scope="col" className="hidden py-2 pr-4 font-medium md:table-cell">
                  Description
                </th>
                <SortableHeader label="Net" sortKey="amountCents" active={sort} direction={direction} onSort={toggleSort} align="right" />
                <th scope="col" className="hidden py-2 pr-4 text-right font-medium sm:table-cell">
                  VAT
                </th>
                <SortableHeader label="Status" sortKey="status" active={sort} direction={direction} onSort={toggleSort} />
                <th scope="col" className="py-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((cost) => (
                <tr key={cost.id} className="border-b">
                  <td className="py-2 pr-4 whitespace-nowrap">{cost.costDate}</td>
                  <td className="py-2 pr-4 capitalize">{cost.category}</td>
                  <td className="py-2 pr-4">{cost.supplier}</td>
                  <td className="hidden py-2 pr-4 md:table-cell">{cost.description}</td>
                  <td className="py-2 pr-4 text-right whitespace-nowrap">{formatCents(cost.amountCents)}</td>
                  <td className="hidden py-2 pr-4 text-right whitespace-nowrap sm:table-cell">{formatCents(cost.vatCents)}</td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={cost.status} />
                  </td>
                  <td className="py-2 text-right">
                    <Link
                      href={`/projects/${projectId}/costs/${cost.id}/edit`}
                      className={`rounded text-blue-700 underline-offset-2 hover:underline ${FOCUS}`}
                    >
                      Edit<span className="sr-only"> {cost.supplier} on {cost.costDate}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  active,
  direction,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  direction: "asc" | "desc";
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const isActive = active === sortKey;
  return (
    <th
      scope="col"
      aria-sort={isActive ? (direction === "asc" ? "ascending" : "descending") : "none"}
      className={`py-2 pr-4 font-medium ${align === "right" ? "text-right" : ""}`}
    >
      <button type="button" onClick={() => onSort(sortKey)} className={`rounded hover:text-zinc-900 ${FOCUS}`}>
        {label}
        <span aria-hidden="true" className="ml-1">
          {isActive ? (direction === "asc" ? "▲" : "▼") : ""}
        </span>
      </button>
    </th>
  );
}

function compare(a: Cost, b: Cost, key: SortKey): number {
  switch (key) {
    case "amountCents":
      return a.amountCents - b.amountCents;
    case "costDate":
      return a.costDate.localeCompare(b.costDate);
    default:
      return String(a[key]).localeCompare(String(b[key]), "en");
  }
}
