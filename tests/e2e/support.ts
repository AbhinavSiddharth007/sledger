import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// The demo account from supabase/seed.sql. It exists only in local development.
export const DEMO = { email: "demo@sledger.test", password: "sledger-demo" };
export const DEMO_USER_ID = "5e1d6e2a-7b3c-4f8a-9d0e-1a2b3c4d5e6f";
export const FIXTURE = path.join(__dirname, "fixtures", "receipt.png");

// Test code talks to the database with the secret key, to set up and clean up its own data.
// Nothing here runs in the browser.
export const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").first().fill(DEMO.email);
  await page.getByLabel("Password").fill(DEMO.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/projects$/);
}

// Creates a project for one test. It belongs to the demo organization, so the demo user can use it.
export async function createTestProject() {
  const { data: membership, error: membershipError } = await admin
    .from("org_members")
    .select("org_id")
    .eq("user_id", DEMO_USER_ID)
    .single();
  if (membershipError) throw membershipError;

  const { data, error } = await admin
    .from("projects")
    .insert({
      name: `E2E ${randomUUID().slice(0, 8)}`,
      client_name: "E2E client",
      budget_cents: 50_000_00,
      org_id: membership.org_id,
    })
    .select("id, org_id")
    .single();
  if (error) throw error;
  return { id: data.id, orgId: data.org_id };
}

// Removes a test project with everything in it, including its receipt files in storage.
export async function removeTestProject(projectId: string) {
  const { data: project } = await admin.from("projects").select("org_id").eq("id", projectId).single();
  if (project) {
    const folder = project.org_id + "/" + projectId;
    const { data: files } = await admin.storage.from("receipts").list(folder);
    const paths = (files ?? []).map((file) => folder + "/" + file.name);
    if (paths.length > 0) await admin.storage.from("receipts").remove(paths);
  }
  await admin.from("costs").delete().eq("project_id", projectId);
  await admin.from("documents").delete().eq("project_id", projectId);
  await admin.from("projects").delete().eq("id", projectId);
}

// A receipt that has already been read, so the review page can be tested without calling Claude.
export async function createExtractedReceipt(projectId: string, orgId: string, supplier: string) {
  // Same layout as the app: <org>/<project>/<sha256>.<ext>. The app's path helper is server-only,
  // so the path is built here.
  const bytes = readFileSync(FIXTURE);
  const hash = createHash("sha256").update(bytes).digest("hex");
  const storagePath = orgId + "/" + projectId + "/" + hash + ".png";
  const { error: uploadError } = await admin.storage
    .from("receipts")
    .upload(storagePath, bytes, { contentType: "image/png", upsert: true });
  if (uploadError) throw uploadError;

  const { data, error } = await admin
    .from("documents")
    .insert({
      project_id: projectId,
      org_id: orgId,
      file_url: storagePath,
      status: "extracted",
      confidence: 0.95,
      raw_extraction: {
        model: "e2e-fixture",
        attempts: [],
        output: {
          supplier,
          date: "2025-03-14",
          line_items: [{ description: "Tornillos", qty: 2, unit_price_cents: 500, total_cents: 1000 }],
          subtotal_cents: 1000,
          vat_cents: 210,
          total_cents: 1210,
          category: "materials",
          confidence: 0.95,
        },
        validation: { issues: [], needsReview: false },
      },
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
