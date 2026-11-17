"use client";

import { useActionState } from "react";
import { uploadReceipt, type UploadState } from "@/app/projects/[projectId]/documents/actions";

export function ReceiptUploadForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState<UploadState, FormData>(
    uploadReceipt.bind(null, projectId),
    {},
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input
        type="file"
        name="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        required
        className="text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {pending ? "Extracting…" : "Upload & extract"}
      </button>
      {state.formError && <p className="w-full text-red-600">{state.formError}</p>}
    </form>
  );
}
