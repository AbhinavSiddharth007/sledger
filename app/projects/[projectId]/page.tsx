import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CostsTable } from "@/components/costs-table";
import { DocumentsList } from "@/components/documents-list";
import { InvoiceStatusButton } from "@/components/invoice-status-button";
import { ReceiptUploadForm } from "@/components/receipt-upload-form";
import { SpendCharts } from "@/components/spend-charts";
import { StatusBadge } from "@/components/status-badge";
import { spendByCategory, spendByMonth } from "@/lib/analytics";
import { formatCents } from "@/lib/format";
import { invoicedCents, marginCents, outstandingCents, paidCents } from "@/lib/invoicing";
import { getProject, listCosts, listDocuments, listInvoices } from "@/lib/queries";
import { uuidSchema } from "@/lib/validations";

// Server Component: loads the project, its costs and receipts. The charts and the filterable
// table are client components that receive this data as props.
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  if (!uuidSchema.safeParse(projectId).success) notFound();

  const project = await getProject(projectId);
  if (!project) notFound();

  const costs = await listCosts(projectId);
  const documents = await listDocuments(projectId);
  const invoices = await listInvoices(projectId);
  const spentCents = costs.reduce((sum, cost) => sum + cost.amountCents, 0);
  const vatCents = costs.reduce((sum, cost) => sum + cost.vatCents, 0);

  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8">
      <Link href="/projects" className="text-sm text-zinc-600 underline-offset-2 hover:underline">
        ← Projects
      </Link>

      <header className="mt-2 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold break-words">{project.name}</h1>
          <p className="text-zinc-600">{project.clientName}</p>
        </div>
        <StatusBadge status={project.status} />
      </header>

      <dl className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Budget" value={formatCents(project.budgetCents)} />
        <Stat label="Spent (net)" value={formatCents(spentCents)} />
        <Stat label="Remaining" value={formatCents(project.budgetCents - spentCents)} />
        <Stat label="VAT" value={formatCents(vatCents)} />
      </dl>

      <section aria-labelledby="invoicing-heading" className="mb-10">
        <h2 id="invoicing-heading" className="mb-4 text-lg font-semibold">
          Invoicing
        </h2>
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Invoiced" value={formatCents(invoicedCents(invoices))} />
          <Stat label="Paid" value={formatCents(paidCents(invoices))} />
          <Stat label="Outstanding" value={formatCents(outstandingCents(invoices))} />
          <Stat label="Margin" hint="Invoiced less confirmed costs" value={formatCents(marginCents(invoices, costs))} />
        </dl>
      </section>

      <section aria-labelledby="charts-heading" className="mb-10">
        <h2 id="charts-heading" className="mb-4 text-lg font-semibold">
          Dashboard
        </h2>
        <SpendCharts
          budgetCents={project.budgetCents}
          spentCents={spentCents}
          byCategory={spendByCategory(costs)}
          byMonth={spendByMonth(costs)}
        />
      </section>

      <section aria-labelledby="costs-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="costs-heading" className="text-lg font-semibold">
            Costs
          </h2>
          <Link
            href={`/projects/${projectId}/costs/new`}
            className="rounded bg-black px-3 py-2 text-sm text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Add cost
          </Link>
        </div>

        <Suspense fallback={<p className="text-zinc-500">Loading costs…</p>}>
          <CostsTable projectId={projectId} costs={costs} />
        </Suspense>
      </section>

      <section aria-labelledby="invoices-heading" className="mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="invoices-heading" className="text-lg font-semibold">
            Invoices
          </h2>
          <Link
            href={`/projects/${projectId}/invoices/new`}
            className="rounded bg-black px-3 py-2 text-sm text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            New invoice
          </Link>
        </div>

        {invoices.length === 0 ? (
          <p className="text-zinc-600">No invoices yet.</p>
        ) : (
          <div className="relative min-w-0 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Invoices for this project</caption>
              <thead className="border-b text-zinc-600">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-medium">Number</th>
                  <th scope="col" className="hidden py-2 pr-4 font-medium sm:table-cell">Issued</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Due</th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">Amount</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Status</th>
                  <th scope="col" className="py-2 font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b align-top">
                    <td className="py-2 pr-4 whitespace-nowrap">{invoice.number}</td>
                    <td className="hidden py-2 pr-4 whitespace-nowrap sm:table-cell">{invoice.issuedAt}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{invoice.dueAt}</td>
                    <td className="py-2 pr-4 text-right whitespace-nowrap">{formatCents(invoice.amountCents)}</td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap items-start gap-2">
                        {invoice.status === "draft" && (
                          <>
                            <Link
                              href={`/projects/${projectId}/invoices/${invoice.id}/edit`}
                              className="rounded px-2 py-1 text-blue-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                            >
                              Edit<span className="sr-only"> invoice {invoice.number}</span>
                            </Link>
                            <InvoiceStatusButton projectId={projectId} invoiceId={invoice.id} status="sent" label="Mark as sent" />
                          </>
                        )}
                        {(invoice.status === "sent" || invoice.status === "overdue") && (
                          <InvoiceStatusButton projectId={projectId} invoiceId={invoice.id} status="paid" label="Mark as paid" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="receipts-heading" className="mt-10">
        <h2 id="receipts-heading" className="mb-4 text-lg font-semibold">
          Receipts
        </h2>
        <div className="mb-4">
          <ReceiptUploadForm projectId={projectId} />
        </div>
        <DocumentsList projectId={projectId} documents={documents} />
      </section>
    </main>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded border border-zinc-200 p-4" title={hint}>
      <dt className="text-sm text-zinc-600">{label}</dt>
      <dd className="truncate text-lg font-semibold">{value}</dd>
    </div>
  );
}
