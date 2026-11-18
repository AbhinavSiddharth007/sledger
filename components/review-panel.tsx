"use client";

import { useOptimistic } from "react";
import { toast } from "sonner";
import { CostForm } from "@/components/cost-form";
import { StatusBadge } from "@/components/status-badge";
import type { CostFormState } from "@/app/projects/[projectId]/costs/actions";
import { confirmReceipt, rejectReceipt } from "@/app/projects/[projectId]/documents/actions";

type Defaults = Partial<{
  category: string;
  supplier: string;
  description: string;
  amount: string;
  vat: string;
  costDate: string;
  status: string;
}>;

// Confirm and reject take effect on screen at once. useOptimistic holds the guessed status until
// the server action finishes. If the action fails, the stored status comes back on its own, and
// a toast says why. A successful confirm redirects, so it never needs to roll back.
export function ReviewPanel({
  projectId,
  documentId,
  status,
  defaults,
  before,
  after,
}: {
  projectId: string;
  documentId: string;
  status: string;
  defaults: Defaults;
  before?: React.ReactNode;
  after?: React.ReactNode;
}) {
  const [shownStatus, setShownStatus] = useOptimistic(status, (_stored: string, guess: string) => guess);
  const reviewable = shownStatus === "pending" || shownStatus === "extracted";

  async function confirm(previous: CostFormState, formData: FormData): Promise<CostFormState> {
    setShownStatus("confirmed");
    try {
      const result = await confirmReceipt(projectId, documentId, previous, formData);
      if (result.formError) toast.error(result.formError);
      else if (result.fieldErrors) toast.error("Check the highlighted fields, then confirm again.");
      return result;
    } catch {
      toast.error("The receipt could not be confirmed. Nothing was saved.");
      return { formError: "The receipt could not be confirmed. Nothing was saved." };
    }
  }

  async function reject() {
    setShownStatus("rejected");
    try {
      await rejectReceipt(projectId, documentId);
    } catch {
      toast.error("The receipt could not be rejected. It is still open for review.");
    }
  }

  return (
    <div className="grid gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Review receipt</h1>
        <StatusBadge status={shownStatus} />
      </header>

      {before}

      {reviewable ? (
        <>
          <CostForm action={confirm} projectId={projectId} defaults={defaults} submitLabel="Confirm cost" />
          <form action={reject}>
            <button
              type="submit"
              className="rounded text-sm text-red-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Reject this receipt
            </button>
          </form>
        </>
      ) : (
        <p role="status" className="text-zinc-600">
          This receipt has already been {shownStatus}.
        </p>
      )}

      {after}
    </div>
  );
}
