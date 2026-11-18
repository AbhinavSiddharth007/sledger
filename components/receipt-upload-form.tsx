"use client";

import { useActionState, useId } from "react";
import { uploadReceipt, type UploadState } from "@/app/projects/[projectId]/documents/actions";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

export function ReceiptUploadForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState<UploadState, FormData>(
    uploadReceipt.bind(null, projectId),
    {},
  );
  const inputId = useId();
  const hintId = `${inputId}-hint`;

  return (
    <form action={formAction} aria-busy={pending} className="grid gap-3 sm:flex sm:flex-wrap sm:items-start">
      <div className="grid gap-1 text-sm">
        <label htmlFor={inputId} className="font-medium">
          Receipt or delivery note
        </label>
        <input
          id={inputId}
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          required
          aria-describedby={hintId}
          aria-invalid={state.formError ? true : undefined}
          className={`text-sm file:mr-3 file:rounded file:border file:px-3 file:py-1.5 ${FOCUS}`}
        />
        <span id={hintId} className="text-zinc-500">
          JPG, PNG, WebP or PDF, up to 10 MB
        </span>
      </div>

      <button
        type="submit"
        disabled={pending}
        className={`rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50 sm:mt-6 ${FOCUS}`}
      >
        {pending ? "Extracting…" : "Upload & extract"}
      </button>

      <p role="status" aria-live="polite" className="text-sm text-zinc-600">
        {pending ? "Reading the receipt. This can take a minute." : null}
      </p>
      {state.formError && (
        <p role="alert" className="w-full text-red-700">
          {state.formError}
        </p>
      )}
    </form>
  );
}
