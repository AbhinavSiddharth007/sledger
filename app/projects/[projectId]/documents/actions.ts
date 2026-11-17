"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { pool } from "@/lib/db";
import { EXTRACTION_MODEL, createExtractionClient, extractReceipt } from "@/lib/receipts/extract";
import { validateReceipt } from "@/lib/receipts/schema";
import { getProject } from "@/lib/queries";
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

  const { rows } = await pool.query(
    `insert into documents (project_id, file_url, status) values ($1, $2, 'pending') returning id`,
    [projectId, fileUrl],
  );
  const documentId: string = rows[0].id;

  const result = await extractReceipt(createExtractionClient(), { data, mediaType: file.type });

  if (result.ok) {
    const validation = validateReceipt(result.receipt);
    const raw = { model: EXTRACTION_MODEL, attempts: result.attempts, output: result.receipt, validation };
    // The schema allows any number, so clamp before it reaches the numeric(4,3) column.
    const confidence = Math.min(1, Math.max(0, result.receipt.confidence));
    await pool.query(
      `update documents set raw_extraction = $2, confidence = $3, status = 'extracted' where id = $1`,
      [documentId, JSON.stringify(raw), confidence],
    );
  } else {
    const raw = { model: EXTRACTION_MODEL, attempts: result.attempts, error: result.error };
    await pool.query(`update documents set raw_extraction = $2 where id = $1`, [
      documentId,
      JSON.stringify(raw),
    ]);
  }

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

  const cost = parsed.data;
  const client = await pool.connect();
  try {
    await client.query("begin");

    const claimed = await client.query(
      `update documents set status = 'confirmed'
       where id = $1 and project_id = $2 and status in ('pending', 'extracted')`,
      [documentId, projectId],
    );
    if (claimed.rowCount === 0) {
      await client.query("rollback");
      return { formError: "This document was already confirmed or rejected." };
    }

    await client.query(
      `insert into costs
         (project_id, category, supplier, description, amount_cents, vat_cents,
          cost_date, source, status)
       values ($1, $2, $3, $4, $5, $6, $7, 'ai_extracted', $8)`,
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

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  redirect(`/projects/${projectId}`);
}

export async function rejectReceipt(projectId: string, documentId: string) {
  if (!uuidSchema.safeParse(projectId).success || !uuidSchema.safeParse(documentId).success) {
    return;
  }

  await pool.query(
    `update documents set status = 'rejected'
     where id = $1 and project_id = $2 and status in ('pending', 'extracted')`,
    [documentId, projectId],
  );

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}
