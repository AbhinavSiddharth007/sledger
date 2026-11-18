"use client";

import { useActionState } from "react";
import { changeInvoiceStatus, type InvoiceFormState } from "@/app/projects/[projectId]/invoices/actions";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

// Moves an invoice along the status flow. A transition the database refuses is shown beside the
// button, so the person can see why nothing changed.
export function InvoiceStatusButton({
  projectId,
  invoiceId,
  status,
  label,
}: {
  projectId: string;
  invoiceId: string;
  status: "sent" | "paid";
  label: string;
}) {
  const [state, formAction, pending] = useActionState<InvoiceFormState, FormData>(
    changeInvoiceStatus.bind(null, projectId, invoiceId),
    {},
  );

  return (
    <form action={formAction} className="inline-grid gap-1">
      <input type="hidden" name="status" value={status} />
      <button type="submit" disabled={pending} className={`w-fit rounded border px-2 py-1 text-sm disabled:opacity-50 ${FOCUS}`}>
        {pending ? "Saving…" : label}
      </button>
      {state.formError && (
        <span role="alert" className="text-sm text-red-700">
          {state.formError}
        </span>
      )}
    </form>
  );
}
