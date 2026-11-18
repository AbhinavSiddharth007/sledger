"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef } from "react";
import { COST_CATEGORIES, COST_STATUSES } from "@/lib/format";
import type { CostFormState } from "@/app/projects/[projectId]/costs/actions";

type Values = {
  category: string;
  supplier: string;
  description: string;
  amount: string;
  vat: string;
  costDate: string;
  status: string;
};

const EMPTY: Values = {
  category: "materials",
  supplier: "",
  description: "",
  amount: "",
  vat: "",
  costDate: "",
  status: "confirmed",
};

export function CostForm({
  action,
  projectId,
  defaults = {},
  submitLabel = "Save cost",
}: {
  action: (state: CostFormState, formData: FormData) => Promise<CostFormState>;
  projectId: string;
  defaults?: Partial<Values>;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};
  const values = { ...EMPTY, ...defaults, ...state.values };
  const formRef = useRef<HTMLFormElement>(null);

  // After a failed submit, move focus to the first field with an error, so a keyboard or screen
  // reader user lands on the problem.
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

      <Field label="Category" name="category" errors={errors.category}>
        {(props) => (
          <select {...props} defaultValue={values.category} className={INPUT}>
            {COST_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field label="Supplier" name="supplier" errors={errors.supplier}>
        {(props) => <input {...props} required defaultValue={values.supplier} autoComplete="organization" className={INPUT} />}
      </Field>

      <Field label="Description" name="description" errors={errors.description}>
        {(props) => <input {...props} required defaultValue={values.description} className={INPUT} />}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Net amount (€)" name="amount" errors={errors.amount} hint="For example 1234.56">
          {(props) => <input {...props} required inputMode="decimal" placeholder="1234.56" defaultValue={values.amount} className={INPUT} />}
        </Field>

        <Field label="VAT (€)" name="vat" errors={errors.vat} hint="Leave empty for none">
          {(props) => <input {...props} inputMode="decimal" placeholder="0.00" defaultValue={values.vat} className={INPUT} />}
        </Field>
      </div>

      <Field label="Date" name="costDate" errors={errors.costDate}>
        {(props) => <input {...props} type="date" required defaultValue={values.costDate} className={INPUT} />}
      </Field>

      <Field label="Status" name="status" errors={errors.status}>
        {(props) => (
          <select {...props} defaultValue={values.status} className={INPUT}>
            {COST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        )}
      </Field>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className={`${BUTTON} bg-black text-white disabled:opacity-50`}>
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href={`/projects/${projectId}`} className={`${BUTTON} border text-zinc-700`}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

export const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";
export const INPUT = `w-full rounded border border-zinc-300 px-3 py-2 ${FOCUS} aria-[invalid=true]:border-red-600`;
const BUTTON = `rounded px-4 py-2 ${FOCUS}`;

type FieldProps = {
  id: string;
  name: string;
  required?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

// A label tied to its input by id, with the errors and hint linked through aria-describedby.
export function Field({
  label,
  name,
  errors,
  hint,
  children,
}: {
  label: string;
  name: string;
  errors?: string[];
  hint?: string;
  children: (props: FieldProps) => React.ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, errors?.length ? errorId : null].filter(Boolean).join(" ");

  return (
    <div className="grid gap-1 text-sm">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {children({
        id,
        name,
        "aria-invalid": errors !== undefined && errors.length > 0,
        "aria-describedby": describedBy || undefined,
      })}
      {hint && (
        <span id={hintId} className="text-zinc-500">
          {hint}
        </span>
      )}
      {errors?.length ? (
        <span id={errorId} className="text-red-700">
          {errors.join(" ")}
        </span>
      ) : null}
    </div>
  );
}
