import { cashFlowByMonth } from "@/lib/invoicing";
import { formatCents, formatMonth } from "@/lib/format";
import { listCashFlowInputs } from "@/lib/queries";

// Money in is paid invoices, dated by payment. Money out is confirmed costs, dated by cost date.
// Both come through RLS, so the figures cover the signed-in user's organization only.
export default async function CashFlowPage() {
  const { paid, costs } = await listCashFlowInputs();
  const months = cashFlowByMonth(paid, costs);
  const totalIn = months.reduce((sum, row) => sum + row.inCents, 0);
  const totalOut = months.reduce((sum, row) => sum + row.outCents, 0);

  return (
    <main id="main" className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Cash flow</h1>

      <dl className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Money in (paid invoices)" value={formatCents(totalIn)} />
        <Stat label="Money out (confirmed costs)" value={formatCents(totalOut)} />
        <Stat label="Net" value={formatCents(totalIn - totalOut)} />
      </dl>

      {months.length === 0 ? (
        <p className="text-zinc-600">No paid invoices or confirmed costs yet.</p>
      ) : (
        <div className="relative min-w-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Money in and out by month, with the running balance</caption>
            <thead className="border-b text-zinc-600">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">Month</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Money in</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Money out</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Net</th>
                <th scope="col" className="py-2 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {months.map((row) => (
                <tr key={row.month} className="border-b">
                  <th scope="row" className="py-2 pr-4 text-left font-normal whitespace-nowrap">
                    {formatMonth(row.month)}
                  </th>
                  <td className="py-2 pr-4 text-right whitespace-nowrap">{formatCents(row.inCents)}</td>
                  <td className="py-2 pr-4 text-right whitespace-nowrap">{formatCents(row.outCents)}</td>
                  <td className="py-2 pr-4 text-right whitespace-nowrap">{formatCents(row.netCents)}</td>
                  <td className="py-2 text-right whitespace-nowrap">{formatCents(row.cumulativeCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded border border-zinc-200 p-4">
      <dt className="text-sm text-zinc-600">{label}</dt>
      <dd className="truncate text-lg font-semibold">{value}</dd>
    </div>
  );
}
