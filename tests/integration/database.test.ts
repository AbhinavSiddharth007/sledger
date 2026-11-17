import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { getDocumentById, getProject, listProjects } from "@/lib/queries";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient as createBrowserClient } from "@/lib/supabase/browser";

// These run against the local Supabase stack (`npm run db:start && npm run db:reset`).
const admin = getSupabaseAdmin();

// Each test makes its own project and removes it afterwards.
const createdProjects: string[] = [];

afterEach(async () => {
  for (const projectId of createdProjects.splice(0)) {
    await admin.from("costs").delete().eq("project_id", projectId);
    await admin.from("documents").delete().eq("project_id", projectId);
    await admin.from("projects").delete().eq("id", projectId);
  }
});

async function createProject() {
  const { data, error } = await admin
    .from("projects")
    .insert({ name: `Test ${randomUUID()}`, client_name: "Test client", budget_cents: 100000 })
    .select("id")
    .single();
  if (error) throw error;
  createdProjects.push(data.id);
  return data.id;
}

async function createDocument(projectId: string, status: string) {
  const { data, error } = await admin
    .from("documents")
    .insert({ project_id: projectId, file_url: `${projectId}/receipt.png`, status })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function countCosts(projectId: string) {
  const { count, error } = await admin
    .from("costs")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  if (error) throw error;
  return count;
}

const confirmArgs = (projectId: string, documentId: string, overrides = {}) => ({
  p_project_id: projectId,
  p_document_id: documentId,
  p_category: "materials",
  p_supplier: "Cerámicas Levante",
  p_description: "Azulejo baño 30x60",
  p_amount_cents: 186400,
  p_vat_cents: 39144,
  p_cost_date: "2025-02-10",
  p_status: "needs_review",
  ...overrides,
});

describe("reads through the server client", () => {
  it("lists the seeded sample projects", async () => {
    const names = (await listProjects()).map((project) => project.name);
    expect(names).toContain("Reforma integral piso Calle Alcalá 45");
  });

  it("totals each project's spend from its costs", async () => {
    const projectId = await createProject();
    await admin.from("costs").insert([
      { project_id: projectId, category: "labour", supplier: "A", description: "x", amount_cents: 1000, cost_date: "2025-01-01", source: "manual" },
      { project_id: projectId, category: "materials", supplier: "B", description: "y", amount_cents: 2550, cost_date: "2025-01-02", source: "manual" },
    ]);

    const summary = (await listProjects()).find((project) => project.id === projectId);
    expect(summary).toMatchObject({ budgetCents: 100000, spentCents: 3550, costCount: 2 });
  });

  it("returns null for projects and documents that do not exist", async () => {
    expect(await getProject(randomUUID())).toBeNull();
    expect(await getDocumentById(randomUUID())).toBeNull();
  });
});

describe("database constraints", () => {
  it("rejects a negative amount", async () => {
    const projectId = await createProject();
    const { error } = await admin.from("costs").insert({
      project_id: projectId, category: "other", supplier: "A", description: "x",
      amount_cents: -1, cost_date: "2025-01-01", source: "manual",
    });
    expect(error).not.toBeNull();
  });

  it("rejects a category outside the allowed list", async () => {
    const projectId = await createProject();
    const { error } = await admin.from("costs").insert({
      project_id: projectId, category: "snacks", supplier: "A", description: "x",
      amount_cents: 100, cost_date: "2025-01-01", source: "manual",
    });
    expect(error).not.toBeNull();
  });
});

describe("confirm_receipt", () => {
  it("turns an extracted receipt into one cost", async () => {
    const projectId = await createProject();
    const documentId = await createDocument(projectId, "extracted");

    const { data: costId, error } = await admin.rpc("confirm_receipt", confirmArgs(projectId, documentId));

    expect(error).toBeNull();
    expect(costId).toEqual(expect.any(String));
    expect((await getDocumentById(documentId))?.status).toBe("confirmed");
    expect(await countCosts(projectId)).toBe(1);

    const { data: cost } = await admin.from("costs").select("source, status, amount_cents").eq("id", costId!).single();
    expect(cost).toEqual({ source: "ai_extracted", status: "needs_review", amount_cents: 186400 });
  });

  it("is idempotent: a second confirm inserts nothing and returns null", async () => {
    const projectId = await createProject();
    const documentId = await createDocument(projectId, "pending");

    await admin.rpc("confirm_receipt", confirmArgs(projectId, documentId));
    const { data: second, error } = await admin.rpc("confirm_receipt", confirmArgs(projectId, documentId));

    expect(error).toBeNull();
    expect(second).toBeNull();
    expect(await countCosts(projectId)).toBe(1);
  });

  it("does not confirm a rejected document", async () => {
    const projectId = await createProject();
    const documentId = await createDocument(projectId, "rejected");

    const { data } = await admin.rpc("confirm_receipt", confirmArgs(projectId, documentId));

    expect(data).toBeNull();
    expect(await countCosts(projectId)).toBe(0);
  });

  it("rolls back the claim when the cost is invalid", async () => {
    const projectId = await createProject();
    const documentId = await createDocument(projectId, "extracted");

    const { error } = await admin.rpc("confirm_receipt", confirmArgs(projectId, documentId, { p_amount_cents: -1 }));

    expect(error).not.toBeNull();
    expect((await getDocumentById(documentId))?.status).toBe("extracted");
    expect(await countCosts(projectId)).toBe(0);
  });
});

describe("Data API exposure", () => {
  it("blocks the publishable key from reading tables", async () => {
    await createProject();
    const { count: adminCount } = await admin.from("projects").select("id", { count: "exact", head: true });
    expect(adminCount).toBeGreaterThan(0);

    const { data, error } = await createBrowserClient().from("projects").select("id");

    // 42501 is Postgres' "permission denied": the migration revokes the table grants.
    expect(error?.code).toBe("42501");
    expect(data).toBeNull();
  });

  it("does not let the publishable key call confirm_receipt", async () => {
    const projectId = await createProject();
    const documentId = await createDocument(projectId, "extracted");

    const { error } = await createBrowserClient().rpc("confirm_receipt", confirmArgs(projectId, documentId));

    expect(error).not.toBeNull();
    expect((await getDocumentById(documentId))?.status).toBe("extracted");
  });
});
