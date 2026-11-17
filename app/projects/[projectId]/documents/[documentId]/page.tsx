import Link from "next/link";
import { notFound } from "next/navigation";
import { CostForm } from "@/components/cost-form";
import { StatusBadge } from "@/components/status-badge";
import { formatCents } from "@/lib/format";
import { getDocument, getProject, type RawExtraction } from "@/lib/queries";
import { uuidSchema } from "@/lib/validations";
import { confirmReceipt, rejectReceipt } from "../actions";

export default async function ReviewReceiptPage({
  params,
}: {
  params: Promise<{ projectId: string; documentId: string }>;
}) {
  const { projectId, documentId } = await params;
  if (!uuidSchema.safeParse(projectId).success || !uuidSchema.safeParse(documentId).success) {
    notFound();
  }

  const project = await getProject(projectId);
  const document = project ? await getDocument(projectId, documentId) : null;
  if (!project || !document) notFound();

  const raw = document.rawExtraction;
  const output = raw?.output;
  const isPdf = document.fileUrl.endsWith(".pdf");
  const previewUrl = `/api/documents/${document.id}`;
  const reviewable = document.status === "pending" || document.status === "extracted";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <Link href={`/projects/${projectId}`} className="text-sm text-zinc-500 hover:underline">
        ← {project.name}
      </Link>
      <header className="mt-2 mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Review receipt</h1>
        <StatusBadge status={document.status} />
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          {isPdf ? (
            <iframe src={previewUrl} title="Receipt" className="h-[80vh] w-full rounded border" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Receipt" className="w-full rounded border" />
          )}
        </section>

        <section className="grid gap-6">
          <Notices raw={raw} />

          {reviewable ? (
            <CostForm
              action={confirmReceipt.bind(null, projectId, documentId)}
              projectId={projectId}
              defaults={output ? toDefaults(output, raw?.validation?.needsReview) : {}}
            />
          ) : (
            <p className="text-zinc-500">This receipt has already been {document.status}.</p>
          )}

          {reviewable && (
            <form action={rejectReceipt.bind(null, projectId, documentId)}>
              <button type="submit" className="text-sm text-red-600 hover:underline">
                Reject this receipt
              </button>
            </form>
          )}

          {output && <LineItems output={output} />}
        </section>
      </div>
    </main>
  );
}

function Notices({ raw }: { raw: RawExtraction | null }) {
  if (raw?.error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        Extraction failed after {raw.attempts.length} attempt(s): {raw.error} Fill in the fields manually.
      </div>
    );
  }

  if (raw?.validation?.issues.length) {
    return (
      <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <p className="mb-1 font-medium">Check these before confirming:</p>
        <ul className="list-disc pl-5">
          {raw.validation.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
}

function LineItems({ output }: { output: NonNullable<RawExtraction["output"]> }) {
  return (
    <div>
      <h2 className="mb-2 font-semibold">Extracted line items</h2>
      <table className="w-full text-left text-sm">
        <thead className="border-b text-zinc-500">
          <tr>
            <th className="py-1 pr-3 font-medium">Description</th>
            <th className="py-1 pr-3 text-right font-medium">Qty</th>
            <th className="py-1 pr-3 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {output.line_items.map((item, index) => (
            <tr key={index} className="border-b">
              <td className="py-1 pr-3">{item.description}</td>
              <td className="py-1 pr-3 text-right">{item.qty}</td>
              <td className="py-1 pr-3 text-right whitespace-nowrap">{formatCents(item.total_cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function toDefaults(output: NonNullable<RawExtraction["output"]>, needsReview?: boolean) {
  return {
    category: output.category,
    supplier: output.supplier,
    description: output.line_items.map((item) => item.description).join("; ").slice(0, 500),
    amount: (output.subtotal_cents / 100).toFixed(2),
    vat: (output.vat_cents / 100).toFixed(2),
    costDate: output.date,
    status: needsReview ? "needs_review" : "confirmed",
  };
}
