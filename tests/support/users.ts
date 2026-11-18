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
  orgId: string;
  client: SupabaseClient<Database>;
};

const created: { userId: string; orgId: string }[] = [];

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
    .from("org_members")
    .select("org_id")
    .eq("user_id", data.user.id)
    .single();
  if (membershipError) throw membershipError;

  const user = { userId: data.user.id, orgId: membership.org_id, client };
  created.push({ userId: user.userId, orgId: user.orgId });
  return user;
}

export async function createProject(orgId: string) {
  const { data, error } = await admin
    .from("projects")
    .insert({ name: `Test ${randomUUID()}`, client_name: "Test client", budget_cents: 100000, org_id: orgId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function createDocument(projectId: string, status: string) {
  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("org_id")
    .eq("id", projectId)
    .single();
  if (projectError) throw projectError;

  const { data, error } = await admin
    .from("documents")
    .insert({ project_id: projectId, org_id: project.org_id, file_url: `${projectId}/receipt.png`, status })
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
// membership, and last the organization.
export async function cleanUpUsers() {
  for (const { userId, orgId } of created.splice(0)) {
    await admin.from("costs").delete().eq("org_id", orgId);
    await admin.from("documents").delete().eq("org_id", orgId);
    await admin.from("projects").delete().eq("org_id", orgId);
    await admin.auth.admin.deleteUser(userId);
    await admin.from("organizations").delete().eq("id", orgId);
  }
}

// Adds an existing user to an organization with the given role. Sign-up only creates owners, so
// tests use this to make members and admins.
export async function addMember(orgId: string, userId: string, role: "owner" | "admin" | "member") {
  const { error } = await admin.from("org_members").insert({ org_id: orgId, user_id: userId, role });
  if (error) throw error;
}

export async function setRole(orgId: string, userId: string, role: "owner" | "admin" | "member") {
  const { error } = await admin.from("org_members").update({ role }).eq("org_id", orgId).eq("user_id", userId);
  if (error) throw error;
}
