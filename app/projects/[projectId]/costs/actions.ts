"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getProject } from "@/lib/queries";
import { requireUser } from "@/lib/auth";
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
  const { supabase } = await requireUser();
  const project = uuidSchema.safeParse(projectId).success ? await getProject(projectId) : null;
  if (!project) {
    return { formError: "Project not found." };
  }

  const parsed = costSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return invalid(parsed.error, formData);
  }

  const cost = parsed.data;
  // The database trigger sets org_id from the project anyway. Passing it keeps the types honest.
  const { error } = await supabase.from("costs").insert({
    project_id: projectId,
    org_id: project.orgId,
    category: cost.category,
    supplier: cost.supplier,
    description: cost.description,
    amount_cents: cost.amountCents,
    vat_cents: cost.vatCents,
    cost_date: cost.costDate,
    source: "manual",
    status: cost.status,
  });
  if (error) throw new Error(error.message, { cause: error });

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
  const { supabase } = await requireUser();
  if (!uuidSchema.safeParse(projectId).success || !uuidSchema.safeParse(costId).success) {
    return { formError: "Cost not found." };
  }

  const parsed = costSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return invalid(parsed.error, formData);
  }

  const cost = parsed.data;
  const { data, error } = await supabase
    .from("costs")
    .update({
      category: cost.category,
      supplier: cost.supplier,
      description: cost.description,
      amount_cents: cost.amountCents,
      vat_cents: cost.vatCents,
      cost_date: cost.costDate,
      status: cost.status,
    })
    .eq("id", costId)
    .eq("project_id", projectId)
    .select("id");
  if (error) throw new Error(error.message, { cause: error });

  if (data.length === 0) {
    return { formError: "Cost not found." };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  redirect(`/projects/${projectId}`);
}
