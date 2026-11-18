import { createClient } from "@/lib/supabase/server";
import { getDocumentById } from "@/lib/queries";
import { mediaTypeFor, readUpload } from "@/lib/storage";
import { uuidSchema } from "@/lib/validations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  // The proxy checks the session too. This route checks again, so it holds if it is reached directly.
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

  const data = await readUpload(document.fileUrl);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": mediaTypeFor(document.fileUrl),
      "Cache-Control": "private, no-cache",
    },
  });
}
