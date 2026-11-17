"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { z } from "zod";
import { EXTRACTION_MODEL, createExtractionClient, extractReceipt } from "@/lib/receipts/extract";
import { validateReceipt } from "@/lib/receipts/schema";
import { getProject } from "@/lib/queries";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { deleteUpload, isAllowedMediaType, MAX_UPLOAD_BYTES, saveUpload } from "@/lib/storage";
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
  const contentHash = createHash("sha256").update(data).digest("hex");
  const fileUrl = await saveUpload(projectId, file.type, data);

  const admin = getSupabaseAdmin();
  const { data: started, error: startError } = await admin.rpc("start_document", {
    p_project_id: projectId,
    p_file_url: fileUrl,
    p_content_hash: contentHash,
  });
  if (startError) throw new Error(startError.message, { cause: startError });
  const [row] = started ?? [];
  if (!row) throw new Error("start_document returned no row.");

  // The same file was uploaded before. Keep the earlier document and skip the extraction call.
  if (!row.created) {
    await deleteUpload(fileUrl);
    redirect(`/projects/${projectId}/documents/${row.document_id}`);
  }

  const result = await extractReceipt(createExtractionClient(), { data, mediaType: file.type });

  const { error: recordError } = await admin.rpc(
    "record_extraction",
    result.ok
      ? {
          p_project_id: projectId,
          p_document_id: row.document_id,
          p_raw_extraction: {
            model: EXTRACTION_MODEL,
            attempts: result.attempts,
            output: result.receipt,
            validation: validateReceipt(result.receipt),
          },
          // The schema allows any number, so clamp before it reaches the numeric(4,3) column.
          p_confidence: Math.min(1, Math.max(0, result.receipt.confidence)),
          p_status: "extracted",
        }
      // A failed extraction leaves the confidence and status alone, so the document stays pending.
      : {
          p_project_id: projectId,
          p_document_id: row.document_id,
          p_raw_extraction: { model: EXTRACTION_MODEL, attempts: result.attempts, error: result.error },
        },
  );
  if (recordError) throw new Error(recordError.message, { cause: recordError });

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}/documents/${row.document_id}`);
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
