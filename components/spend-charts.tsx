"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCents } from "@/lib/format";
import type { CategorySpend, MonthSpend } from "@/lib/analytics";

const BLUE = "#2563eb";
const ZINC = "#a1a1aa";
const RED = "#dc2626";

// Receives plain data from the server page. Each chart has a text summary, because an SVG chart
// on its own means nothing to a screen reader.
export function SpendCharts({
  budgetCents,
  spentCents,
  byCategory,
  byMonth,
}: {
  budgetCents: number;
  spentCents: number;
  byCategory: CategorySpend[];
  byMonth: MonthSpend[];
}) {
  const overBudget = spentCents > budgetCents;
  const budgetData = [
    { name: "Budget", cents: budgetCents },
    { name: "Spent", cents: spentCents },
  ];
  const percent = budgetCents > 0 ? Math.round((spentCents / budgetCents) * 100) : 0;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Panel
        title="Budget vs spent"
        summary={`Budget ${formatCents(budgetCents)}, spent ${formatCents(spentCents)}, ${percent}% used.`}
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={budgetData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tickLine={false} />
            <YAxis tickFormatter={(value: number) => formatCents(value)} width={90} tickLine={false} />
            <Tooltip formatter={(value) => formatCents(Number(value))} />
            <Bar dataKey="cents" radius={[4, 4, 0, 0]}>
              {budgetData.map((entry) => (
                <Cell key={entry.name} fill={entry.name === "Spent" && overBudget ? RED : entry.name === "Spent" ? BLUE : ZINC} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel
        title="Spent by category"
        summary={byCategory.map((row) => `${row.category} ${formatCents(row.spentCents)}`).join(", ")}
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={byCategory} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="category" tickLine={false} />
            <YAxis tickFormatter={(value: number) => formatCents(value)} width={90} tickLine={false} />
            <Tooltip formatter={(value) => formatCents(Number(value))} />
            <Bar dataKey="spentCents" fill={BLUE} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel
        title="Monthly spend"
        summary={
          byMonth.length === 0
            ? "No costs yet."
            : byMonth.map((row) => `${row.month} ${formatCents(row.spentCents)}`).join(", ")
        }
      >
        {byMonth.length === 0 ? (
          <p className="py-16 text-center text-zinc-500">No costs yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byMonth} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tickLine={false} />
              <YAxis tickFormatter={(value: number) => formatCents(value)} width={90} tickLine={false} />
              <Tooltip formatter={(value) => formatCents(Number(value))} />
              <Bar dataKey="spentCents" fill={BLUE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>
    </div>
  );
}

function Panel({ title, summary, children }: { title: string; summary: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded border border-zinc-200 p-4" aria-labelledby={`${slug(title)}-title`}>
      <h3 id={`${slug(title)}-title`} className="mb-2 font-medium">
        {title}
      </h3>
      <div role="img" aria-label={`${title}. ${summary}`}>
        {children}
      </div>
      <p className="sr-only">{summary}</p>
    </section>
  );
}

const slug = (text: string) => text.toLowerCase().replace(/[^a-z]+/g, "-");
