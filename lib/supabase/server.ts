import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { publicSupabaseConfig } from "@/lib/supabase/config";

// For server code that acts as the signed-in user. Carries the session in cookies.
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = publicSupabaseConfig();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. Nothing to set there.
        }
      },
    },
  });
}
