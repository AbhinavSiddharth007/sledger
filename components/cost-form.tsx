"use client";

import Link from "next/link";
import { useActionState } from "react";
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
}: {
  action: (state: CostFormState, formData: FormData) => Promise<CostFormState>;
  projectId: string;
  defaults?: Partial<Values>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};
  const values = { ...EMPTY, ...defaults, ...state.values };

  return (
    <form action={formAction} className="grid max-w-xl gap-4">
      {state.formError && <p className="text-red-600">{state.formError}</p>}

      <Field label="Category" errors={errors.category}>
        <select name="category" defaultValue={values.category} className={INPUT}>
          {COST_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Supplier" errors={errors.supplier}>
        <input name="supplier" defaultValue={values.supplier} className={INPUT} />
      </Field>

      <Field label="Description" errors={errors.description}>
        <input name="description" defaultValue={values.description} className={INPUT} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Net amount (€)" errors={errors.amount}>
          <input name="amount" inputMode="decimal" placeholder="1234.56" defaultValue={values.amount} className={INPUT} />
        </Field>

        <Field label="VAT (€)" errors={errors.vat}>
          <input name="vat" inputMode="decimal" placeholder="0.00" defaultValue={values.vat} className={INPUT} />
        </Field>
      </div>

      <Field label="Date" errors={errors.costDate}>
        <input type="date" name="costDate" defaultValue={values.costDate} className={INPUT} />
      </Field>

      <Field label="Status" errors={errors.status}>
        <select name="status" defaultValue={values.status} className={INPUT}>
          {COST_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save cost"}
        </button>
        <Link href={`/projects/${projectId}`} className="px-4 py-2 text-zinc-600">
          Cancel
        </Link>
      </div>
    </form>
  );
}

const INPUT = "w-full rounded border border-zinc-300 px-3 py-2";

function Field({
  label,
  errors,
  children,
}: {
  label: string;
  errors?: string[];
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {errors?.map((message) => (
        <span key={message} className="text-red-600">
          {message}
        </span>
      ))}
    </label>
  );
}
