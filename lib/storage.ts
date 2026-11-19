import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Receipts are stored in a private Supabase Storage bucket. Every call goes through the signed-in
// user's client, so the storage policies decide what that user may read, write or delete.

export const RECEIPT_BUCKET = "receipts";
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
// A signed URL works for this long. Long enough to read the receipt, short enough to be safe.
export const SIGNED_URL_SECONDS = 300;

const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const isAllowedMediaType = (mediaType: string) => mediaType in EXTENSIONS;

// <org_id>/<project_id>/<sha256>.<ext>. The first folder is the organization, which is what the
// storage policies check. The hash is the name, so the same file always has the same path.
export function receiptPath(orgId: string, projectId: string, contentHash: string, mediaType: string) {
  if (!isAllowedMediaType(mediaType)) throw new Error(`Unsupported file type: ${mediaType}`);
  if (!/^[0-9a-f]{64}$/.test(contentHash)) throw new Error("The content hash must be a SHA-256 hex digest.");
  return `${orgId}/${projectId}/${contentHash}.${EXTENSIONS[mediaType]}`;
}

// Uploading the same file twice fails with a conflict, because the path already exists. The caller
// treats that as a duplicate, not a failure.
export function isAlreadyStored(error: { statusCode?: string; message: string }) {
  return error.statusCode === "409" || /already exists/i.test(error.message);
}

export async function storeReceipt(
  supabase: SupabaseClient<Database>,
  path: string,
  data: Buffer,
  mediaType: string,
) {
  return supabase.storage.from(RECEIPT_BUCKET).upload(path, data, {
    contentType: mediaType,
    upsert: false,
  });
}

// A short-lived link to one receipt. Creating it needs read access under the storage policies,
// so a user from another organization gets an error instead of a link.
export async function signedReceiptUrl(supabase: SupabaseClient<Database>, path: string) {
  const { data, error } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error) throw new Error(error.message, { cause: error });
  return data.signedUrl;
}
