import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceForm } from "@/components/invoice-form";
import { getInvoice, getProject } from "@/lib/queries";
import { uuidSchema } from "@/lib/validations";
import { updateInvoice } from "../../actions";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ projectId: string; invoiceId: string }>;
}) {
  const { projectId, invoiceId } = await params;
  if (!uuidSchema.safeParse(projectId).success || !uuidSchema.safeParse(invoiceId).success) notFound();

  const project = await getProject(projectId);
  const invoice = project ? await getInvoice(projectId, invoiceId) : null;
  if (!project || !invoice) notFound();

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link href={`/projects/${projectId}`} className="text-sm text-zinc-600 underline-offset-2 hover:underline">
        ← {project.name}
      </Link>
      <h1 className="mt-2 mb-2 text-2xl font-semibold">Invoice {invoice.number}</h1>

      {invoice.status === "draft" ? (
        <InvoiceForm
          action={updateInvoice.bind(null, projectId, invoiceId)}
          defaults={{
            amount: (invoice.amountCents / 100).toFixed(2),
            issuedAt: invoice.issuedAt,
            dueAt: invoice.dueAt,
          }}
          submitLabel="Save draft"
          cancelHref={`/projects/${projectId}`}
        />
      ) : (
        <p role="status" className="mt-4 text-zinc-600">
          This invoice is {invoice.status}. Only a draft invoice can be edited.
        </p>
      )}
    </main>
  );
}
