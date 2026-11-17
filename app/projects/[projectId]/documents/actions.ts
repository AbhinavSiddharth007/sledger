"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { EXTRACTION_MODEL, createExtractionClient, extractReceipt } from "@/lib/receipts/extract";
import { validateReceipt } from "@/lib/receipts/schema";
import { getProject } from "@/lib/queries";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAllowedMediaType, MAX_UPLOAD_BYTES, saveUpload } from "@/lib/storage";
import { costSchema, uuidSchema } from "@/lib/validations";
import type { CostFormState } from "@/app/projects/[projectId]/costs/actions";

export type UploadState = {
  formError?: string;
};

export async function uploadReceipt(
  projectId: string,
  _previous: UploadState,
  formData: FormData,
): Promise<UploadState> {
  if (!uuidSchema.safeParse(projectId).success || !(await getProject(projectId))) {
    return { formError: "Project not found." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { formError: "Choose a file to upload." };
  }
  if (!isAllowedMediaType(file.type)) {
    return { formError: "Upload a JPG, PNG, WebP or PDF file." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { formError: "Files must be 10 MB or smaller." };
  }

  const data = Buffer.from(await file.arrayBuffer());
  const fileUrl = await saveUpload(projectId, file.type, data);

  const admin = getSupabaseAdmin();
  const { data: inserted, error: insertError } = await admin
    .from("documents")
    .insert({ project_id: projectId, file_url: fileUrl, status: "pending" })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message, { cause: insertError });
  const documentId = inserted.id;

  const result = await extractReceipt(createExtractionClient(), { data, mediaType: file.type });

  let update;
  if (result.ok) {
    const validation = validateReceipt(result.receipt);
    const raw = { model: EXTRACTION_MODEL, attempts: result.attempts, output: result.receipt, validation };
    // The schema allows any number, so clamp before it reaches the numeric(4,3) column.
    const confidence = Math.min(1, Math.max(0, result.receipt.confidence));
    update = { raw_extraction: raw, confidence, status: "extracted" };
  } else {
    update = { raw_extraction: { model: EXTRACTION_MODEL, attempts: result.attempts, error: result.error } };
  }
  const { error: updateError } = await admin.from("documents").update(update).eq("id", documentId);
  if (updateError) throw new Error(updateError.message, { cause: updateError });

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}/documents/${documentId}`);
}

export async function confirmReceipt(
  projectId: string,
  documentId: string,
  _previous: CostFormState,
  formData: FormData,
): Promise<CostFormState> {
  if (!uuidSchema.safeParse(projectId).success || !uuidSchema.safeParse(documentId).success) {
    return { formError: "Document not found." };
  }

  const parsed = costSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values: Object.fromEntries(formData) as Record<string, string>,
    };
  }

  // One transaction in Postgres: claims the document and inserts the cost, or neither.
  const { data: costId, error } = await getSupabaseAdmin().rpc("confirm_receipt", {
    p_project_id: projectId,
    p_document_id: documentId,
    p_category: parsed.data.category,
    p_supplier: parsed.data.supplier,
    p_description: parsed.data.description,
    p_amount_cents: parsed.data.amountCents,
    p_vat_cents: parsed.data.vatCents,
    p_cost_date: parsed.data.costDate,
    p_status: parsed.data.status,
  });
  if (error) throw new Error(error.message, { cause: error });

  // The function returns null when the document was not pending or extracted.
  if (costId === null) {
    return { formError: "This document was already confirmed or rejected." };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  redirect(`/projects/${projectId}`);
}

export async function rejectReceipt(projectId: string, documentId: string) {
  if (!uuidSchema.safeParse(projectId).success || !uuidSchema.safeParse(documentId).success) {
    return;
  }

  const { error } = await getSupabaseAdmin()
    .from("documents")
    .update({ status: "rejected" })
    .eq("id", documentId)
    .eq("project_id", projectId)
    .in("status", ["pending", "extracted"]);
  if (error) throw new Error(error.message, { cause: error });

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}
