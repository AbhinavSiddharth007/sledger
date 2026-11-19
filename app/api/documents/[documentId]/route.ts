import { NextResponse } from "next/server";
import { getDocumentById } from "@/lib/queries";
import { signedReceiptUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validations";

// Sends the browser to a short-lived signed link for the receipt. The document lookup and the link
// both run as the signed-in user, so storage and row level security decide who gets the file.
export async function GET(_request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const { data: claims } = await (await createClient()).auth.getClaims();
  if (!claims) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { documentId } = await params;
  if (!uuidSchema.safeParse(documentId).success) {
    return new Response("Not found", { status: 404 });
  }

  const document = await getDocumentById(documentId);
  if (!document) {
    return new Response("Not found", { status: 404 });
  }

  const url = await signedReceiptUrl(await createClient(), document.fileUrl);
  return NextResponse.redirect(url, { headers: { "Cache-Control": "private, no-store" } });
}
