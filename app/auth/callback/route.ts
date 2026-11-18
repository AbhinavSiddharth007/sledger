import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase sends the magic-link user here with a one-time code. Trading it for a session
// sets the auth cookies on this response.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(pageUrl("/projects"));
  }

  const message = "That sign-in link is invalid or has expired. Request a new one.";
  return NextResponse.redirect(pageUrl("/login", { error: message }));
}

// The magic link was sent to NEXT_PUBLIC_SITE_URL, so return to that host. Cookies are per
// host, and a redirect to another host would drop the session.
function pageUrl(pathname: string, params?: Record<string, string>) {
  const url = new URL(pathname, process.env.NEXT_PUBLIC_SITE_URL);
  if (params) url.search = new URLSearchParams(params).toString();
  return url;
}
