"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { invoiceSchema, uuidSchema } from "@/lib/validations";

export type InvoiceFormState = {
  fieldErrors?: Record<string, string[] | undefined>;
  formError?: string;
  values?: Record<string, string>;
};

// Creating an invoice goes through create_invoice, which assigns the number safely under
// concurrency (see the migration). The database trigger enforces the status rules, so a
// transition the database refuses comes back here as its message.
export async function createInvoice(
  projectId: string,
  _previous: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  const { supabase } = await requireUser();
  if (!uuidSchema.safeParse(projectId).success) return { formError: "Project not found." };

  const parsed = invoiceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);

  const { error } = await supabase.rpc("create_invoice", {
    p_project_id: projectId,
    p_amount_cents: parsed.data.amountCents,
    p_issued_at: parsed.data.issuedAt,
    p_due_at: parsed.data.dueAt,
  });
  if (error) {
    if (error.message === "Project not found") return { formError: "Project not found." };
    throw new Error(error.message, { cause: error });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects/cash-flow");
  redirect(`/projects/${projectId}`);
}

export async function updateInvoice(
  projectId: string,
  invoiceId: string,
  _previous: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  const { supabase } = await requireUser();
  if (!uuidSchema.safeParse(projectId).success || !uuidSchema.safeParse(invoiceId).success) {
    return { formError: "Invoice not found." };
  }

  const parsed = invoiceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);

  // Only drafts can be edited. The status filter here and the trigger both enforce it.
  const { data, error } = await supabase
    .from("invoices")
    .update({
      amount_cents: parsed.data.amountCents,
      issued_at: parsed.data.issuedAt,
      due_at: parsed.data.dueAt,
    })
    .eq("id", invoiceId)
    .eq("project_id", projectId)
    .eq("status", "draft")
    .select("id");
  if (error) {
    if (error.message.startsWith("Only a draft")) return { formError: error.message };
    throw new Error(error.message, { cause: error });
  }
  if (data.length === 0) return { formError: "Only a draft invoice can be edited." };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects/cash-flow");
  redirect(`/projects/${projectId}`);
}

export async function changeInvoiceStatus(
  projectId: string,
  invoiceId: string,
  _previous: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  const { supabase } = await requireUser();
  if (!uuidSchema.safeParse(projectId).success || !uuidSchema.safeParse(invoiceId).success) {
    return { formError: "Invoice not found." };
  }

  const status = z.enum(["sent", "paid"]).safeParse(formData.get("status"));
  if (!status.success) return { formError: "Choose a valid status." };

  const { data, error } = await supabase
    .from("invoices")
    .update({ status: status.data })
    .eq("id", invoiceId)
    .eq("project_id", projectId)
    .select("id");
  if (error) {
    // The trigger refuses a transition the status flow does not allow. Its message is safe to show.
    if (error.message.startsWith("An invoice cannot go from")) return { formError: error.message };
    throw new Error(error.message, { cause: error });
  }
  if (data.length === 0) return { formError: "Invoice not found." };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects/cash-flow");
  return {};
}

function invalid(error: z.ZodError, formData: FormData): InvoiceFormState {
  return {
    fieldErrors: z.flattenError(error).fieldErrors,
    values: Object.fromEntries(formData) as Record<string, string>,
  };
}
