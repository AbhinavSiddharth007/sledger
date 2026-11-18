import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceForm } from "@/components/invoice-form";
import { getProject } from "@/lib/queries";
import { uuidSchema } from "@/lib/validations";
import { createInvoice } from "../actions";

export default async function NewInvoicePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!uuidSchema.safeParse(projectId).success) notFound();

  const project = await getProject(projectId);
  if (!project) notFound();

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link href={`/projects/${projectId}`} className="text-sm text-zinc-600 underline-offset-2 hover:underline">
        ← {project.name}
      </Link>
      <h1 className="mt-2 mb-2 text-2xl font-semibold">New invoice</h1>
      <p className="mb-6 text-zinc-600">
        The invoice is created as a draft with the next number for your organization. You can edit it until you send it.
      </p>
      <InvoiceForm
        action={createInvoice.bind(null, projectId)}
        submitLabel="Create draft invoice"
        cancelHref={`/projects/${projectId}`}
      />
    </main>
  );
}
