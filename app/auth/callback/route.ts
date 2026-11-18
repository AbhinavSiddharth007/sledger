import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase sends the magic-link user here with a one-time code. Trading it for a session
// sets the auth cookies on this response.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/projects", request.url));
  }

  const message = "That sign-in link is invalid or has expired. Request a new one.";
  return NextResponse.redirect(new URL(`/login?${new URLSearchParams({ error: message })}`, request.url));
}
