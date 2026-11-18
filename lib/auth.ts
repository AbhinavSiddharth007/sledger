import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Every Server Action calls this before anything else. The proxy checks the session too, but
// a Server Action can be called directly, so it checks again.
export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data) redirect("/login");
  return { supabase, userId: data.claims.sub };
}

// For actions that sign a user in. A signed-in user has nothing to do there.
export async function redirectIfSignedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data) redirect("/projects");
  return supabase;
}
