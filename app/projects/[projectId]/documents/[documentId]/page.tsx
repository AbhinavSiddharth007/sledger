import Link from "next/link";
import { notFound } from "next/navigation";
import { ReviewPanel } from "@/components/review-panel";
import { formatCents } from "@/lib/format";
import { getDocument, getProject, type RawExtraction } from "@/lib/queries";
import { uuidSchema } from "@/lib/validations";

// Server Component: loads the receipt and its extraction. The confirm and reject controls are a
// client component, which receives these notices and line items as slots.
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

  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8">
      <Link href={`/projects/${projectId}`} className="text-sm text-zinc-600 underline-offset-2 hover:underline">
        ← {project.name}
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        <section aria-label="Receipt preview" className="min-w-0">
          {isPdf ? (
            <iframe src={previewUrl} title="Receipt" className="h-[60vh] w-full rounded border lg:h-[80vh]" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Receipt to review" className="w-full rounded border" />
          )}
        </section>

        <ReviewPanel
          projectId={projectId}
          documentId={documentId}
          status={document.status}
          defaults={output ? toDefaults(output, raw?.validation?.needsReview) : {}}
          before={<Notices raw={raw} />}
          after={output ? <LineItems output={output} /> : null}
        />
      </div>
    </main>
  );
}

function Notices({ raw }: { raw: RawExtraction | null }) {
  if (raw?.error) {
    return (
      <div role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900">
        Extraction failed after {raw.attempts.length} attempt(s): {raw.error} Fill in the fields manually.
      </div>
    );
  }

  if (raw?.validation?.issues.length) {
    return (
      <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
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
    <section aria-labelledby="line-items-heading" className="overflow-x-auto">
      <h2 id="line-items-heading" className="mb-2 font-semibold">
        Extracted line items
      </h2>
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Line items read from the receipt</caption>
        <thead className="border-b text-zinc-600">
          <tr>
            <th scope="col" className="py-1 pr-3 font-medium">Description</th>
            <th scope="col" className="py-1 pr-3 text-right font-medium">Qty</th>
            <th scope="col" className="py-1 pr-3 text-right font-medium">Total</th>
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
    </section>
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
