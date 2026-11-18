"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { Field, FOCUS, INPUT } from "@/components/cost-form";
import type { InvoiceFormState } from "@/app/projects/[projectId]/invoices/actions";

type Values = { amount: string; issuedAt: string; dueAt: string };
const EMPTY: Values = { amount: "", issuedAt: "", dueAt: "" };

export function InvoiceForm({
  action,
  defaults = {},
  submitLabel,
  cancelHref,
}: {
  action: (state: InvoiceFormState, formData: FormData) => Promise<InvoiceFormState>;
  defaults?: Partial<Values>;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};
  const values = { ...EMPTY, ...defaults, ...state.values };
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.fieldErrors) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} aria-busy={pending} className="grid max-w-xl gap-4">
      {state.formError && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-red-700">
          {state.formError}
        </p>
      )}

      <Field label="Amount, net (€)" name="amount" errors={errors.amount} hint="Before VAT, for example 1234.56">
        {(props) => <input {...props} required inputMode="decimal" defaultValue={values.amount} className={INPUT} />}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Issue date" name="issuedAt" errors={errors.issuedAt}>
          {(props) => <input {...props} type="date" required defaultValue={values.issuedAt} className={INPUT} />}
        </Field>

        <Field label="Due date" name="dueAt" errors={errors.dueAt}>
          {(props) => <input {...props} type="date" required defaultValue={values.dueAt} className={INPUT} />}
        </Field>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className={`rounded bg-black px-4 py-2 text-white disabled:opacity-50 ${FOCUS}`}>
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href={cancelHref} className={`rounded border px-4 py-2 text-zinc-700 ${FOCUS}`}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
