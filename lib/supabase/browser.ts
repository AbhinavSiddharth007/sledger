import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { publicSupabaseConfig } from "@/lib/supabase/config";

// For client components. Anything it reads is limited by row level security.
export function createClient() {
  const { url, publishableKey } = publicSupabaseConfig();
  return createBrowserClient<Database>(url, publishableKey);
}
