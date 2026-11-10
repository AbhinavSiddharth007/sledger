"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getProject } from "@/lib/queries";
import { costSchema, uuidSchema } from "@/lib/validations";

export type CostFormState = {
  fieldErrors?: Record<string, string[] | undefined>;
  formError?: string;
  // Submitted values, so the form can repopulate after a validation error.
  values?: Record<string, string>;
};

function invalid(error: z.ZodError, formData: FormData): CostFormState {
  return {
    fieldErrors: z.flattenError(error).fieldErrors,
    values: Object.fromEntries(formData) as Record<string, string>,
  };
}

export async function createCost(
  projectId: string,
  _previous: CostFormState,
  formData: FormData,
): Promise<CostFormState> {
  if (!uuidSchema.safeParse(projectId).success || !(await getProject(projectId))) {
    return { formError: "Project not found." };
  }

  const parsed = costSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return invalid(parsed.error, formData);
  }

  const cost = parsed.data;
  await pool.query(
    `insert into costs
       (project_id, category, supplier, description, amount_cents, vat_cents,
        cost_date, source, status)
     values ($1, $2, $3, $4, $5, $6, $7, 'manual', $8)`,
    [
      projectId,
      cost.category,
      cost.supplier,
      cost.description,
      cost.amountCents,
      cost.vatCents,
      cost.costDate,
      cost.status,
    ],
  );

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  redirect(`/projects/${projectId}`);
}

export async function updateCost(
  projectId: string,
  costId: string,
  _previous: CostFormState,
  formData: FormData,
): Promise<CostFormState> {
  if (!uuidSchema.safeParse(projectId).success || !uuidSchema.safeParse(costId).success) {
    return { formError: "Cost not found." };
  }

  const parsed = costSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return invalid(parsed.error, formData);
  }

  const cost = parsed.data;
  const result = await pool.query(
    `update costs
     set category = $3, supplier = $4, description = $5, amount_cents = $6,
         vat_cents = $7, cost_date = $8, status = $9
     where id = $1 and project_id = $2`,
    [
      costId,
      projectId,
      cost.category,
      cost.supplier,
      cost.description,
      cost.amountCents,
      cost.vatCents,
      cost.costDate,
      cost.status,
    ],
  );

  if (result.rowCount === 0) {
    return { formError: "Cost not found." };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  redirect(`/projects/${projectId}`);
}
