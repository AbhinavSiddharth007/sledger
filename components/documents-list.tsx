import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import type { Document } from "@/lib/queries";

export function DocumentsList({ projectId, documents }: { projectId: string; documents: Document[] }) {
  if (documents.length === 0) {
    return <p className="text-zinc-500">No receipts uploaded yet.</p>;
  }

  return (
    <ul className="divide-y">
      {documents.map((document) => (
        <li key={document.id} className="flex items-center justify-between gap-4 py-2 text-sm">
          <Link
            href={`/projects/${projectId}/documents/${document.id}`}
            className="text-blue-600 hover:underline"
          >
            {document.rawExtraction?.output
              ? `${document.rawExtraction.output.supplier} · ${document.rawExtraction.output.date}`
              : "Receipt awaiting extraction"}
          </Link>
          <div className="flex items-center gap-3">
            {document.confidence !== null && (
              <span className="text-zinc-500">{Math.round(document.confidence * 100)}%</span>
            )}
            <StatusBadge status={document.status} />
          </div>
        </li>
      ))}
    </ul>
  );
}
