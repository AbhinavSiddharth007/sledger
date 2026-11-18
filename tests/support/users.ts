import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Test helpers. They use the admin client to set up data, and a real signed-in client to act
// as a user, so row level security is what decides what each user can see.

export const admin = getSupabaseAdmin();
const PASSWORD = "test-password-123";

export type TestUser = {
  userId: string;
  tenantId: string;
  client: SupabaseClient<Database>;
};

const created: { userId: string; tenantId: string }[] = [];

export function anonymousClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// Creates a user through Auth, which also gives it a workspace via the sign-up trigger, then
// signs it in with the publishable key.
export async function createSignedInUser(): Promise<TestUser> {
  const email = `user-${randomUUID()}@test.local`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;

  const client = anonymousClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInError) throw signInError;

  const { data: membership, error: membershipError } = await admin
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", data.user.id)
    .single();
  if (membershipError) throw membershipError;

  const user = { userId: data.user.id, tenantId: membership.tenant_id, client };
  created.push({ userId: user.userId, tenantId: user.tenantId });
  return user;
}

export async function createProject(tenantId: string) {
  const { data, error } = await admin
    .from("projects")
    .insert({ name: `Test ${randomUUID()}`, client_name: "Test client", budget_cents: 100000, tenant_id: tenantId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function createDocument(projectId: string, status: string) {
  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("tenant_id")
    .eq("id", projectId)
    .single();
  if (projectError) throw projectError;

  const { data, error } = await admin
    .from("documents")
    .insert({ project_id: projectId, tenant_id: project.tenant_id, file_url: `${projectId}/receipt.png`, status })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function countCosts(projectId: string) {
  const { count, error } = await admin
    .from("costs")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  if (error) throw error;
  return count;
}

// Removes everything a test user created. Children go first, then the user, which removes its
// membership, and last the tenant.
export async function cleanUpUsers() {
  for (const { userId, tenantId } of created.splice(0)) {
    await admin.from("costs").delete().eq("tenant_id", tenantId);
    await admin.from("documents").delete().eq("tenant_id", tenantId);
    await admin.from("projects").delete().eq("tenant_id", tenantId);
    await admin.auth.admin.deleteUser(userId);
    await admin.from("tenants").delete().eq("id", tenantId);
  }
}
