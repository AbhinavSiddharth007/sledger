import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { admin, cleanUpUsers, createDocument, createProject, createSignedInUser } from "../support/users";

// Alice is in organization A and Bob is in organization B. Each owns one row of every kind.
// Alice must get nothing from B: no rows back on read, no rows changed on update, no rows
// removed on delete.

afterEach(cleanUpUsers);

// Either outcome means nothing was changed: no rows back, or a permission error where no grant exists.
function expectNothing(result: { data: unknown[] | null; error: { code: string } | null }) {
  expect(result.data ?? []).toEqual([]);
  if (result.error) expect(result.error.code).toBe("42501");
}

async function setUpOrganization() {
  const user = await createSignedInUser();
  const projectId = await createProject(user.orgId);
  const { data: cost, error: costError } = await admin
    .from("costs")
    .insert({
      project_id: projectId, org_id: user.orgId, category: "other", supplier: "S", description: "d",
      amount_cents: 1000, cost_date: "2025-01-01", source: "manual",
    })
    .select("id")
    .single();
  if (costError) throw costError;
  const documentId = await createDocument(projectId, "extracted");
  const { data: invoice, error: invoiceError } = await admin
    .from("invoices")
    .insert({
      project_id: projectId, org_id: user.orgId, number: `INV-${randomUUID()}`, amount_cents: 1000,
      issued_at: "2025-01-01", due_at: "2025-02-01",
    })
    .select("id")
    .single();
  if (invoiceError) throw invoiceError;
  return { user, projectId, costId: cost.id, documentId, invoiceId: invoice.id };
}

async function setUp() {
  const alice = await createSignedInUser();
  const bob = await setUpOrganization();
  return { alice, bob };
}

describe("organization A reads nothing from organization B", () => {
  it("returns no projects, costs, documents or invoices of B", async () => {
    const { alice, bob } = await setUp();

    const projects = await alice.client.from("projects").select("id").eq("id", bob.projectId);
    const costs = await alice.client.from("costs").select("id").eq("id", bob.costId);
    const documents = await alice.client.from("documents").select("id").eq("id", bob.documentId);
    const invoices = await alice.client.from("invoices").select("id").eq("id", bob.invoiceId);

    expect(projects.data).toEqual([]);
    expect(costs.data).toEqual([]);
    expect(documents.data).toEqual([]);
    expect(invoices.data).toEqual([]);
  });

  it("sees neither B's organization nor its members", async () => {
    const { alice, bob } = await setUp();

    const { data: organizations } = await alice.client.from("organizations").select("id").eq("id", bob.user.orgId);
    const { data: members } = await alice.client.from("org_members").select("user_id").eq("org_id", bob.user.orgId);

    expect(organizations).toEqual([]);
    expect(members).toEqual([]);
  });

  it("gets no rows at all from a B-wide query", async () => {
    const { alice, bob } = await setUp();

    const { data: costs } = await alice.client.from("costs").select("id, org_id");

    expect(costs?.some((row) => row.org_id === bob.user.orgId)).toBe(false);
  });
});

describe("organization A cannot change organization B", () => {
  it("updates nothing in B's tables, and B's rows are unchanged", async () => {
    const { alice, bob } = await setUp();

    const updates = await Promise.all([
      alice.client.from("projects").update({ name: "Changed" }).eq("id", bob.projectId).select("id"),
      alice.client.from("costs").update({ amount_cents: 1 }).eq("id", bob.costId).select("id"),
      alice.client.from("documents").update({ status: "rejected" }).eq("id", bob.documentId).select("id"),
      alice.client.from("invoices").update({ status: "paid" }).eq("id", bob.invoiceId).select("id"),
      alice.client.from("organizations").update({ name: "Changed" }).eq("id", bob.user.orgId).select("id"),
    ]);

    updates.forEach(expectNothing);
    expect((await admin.from("projects").select("name").eq("id", bob.projectId).single()).data?.name).not.toBe("Changed");
    expect((await admin.from("costs").select("amount_cents").eq("id", bob.costId).single()).data?.amount_cents).toBe(1000);
    expect((await admin.from("documents").select("status").eq("id", bob.documentId).single()).data?.status).toBe("extracted");
    expect((await admin.from("invoices").select("status").eq("id", bob.invoiceId).single()).data?.status).toBe("draft");
    expect((await admin.from("organizations").select("name").eq("id", bob.user.orgId).single()).data?.name).not.toBe("Changed");
  });

  it("cannot move a row of its own into B", async () => {
    const { alice, bob } = await setUp();
    const alicesProject = await createProject(alice.orgId);

    const { error } = await alice.client.from("projects").update({ org_id: bob.user.orgId }).eq("id", alicesProject);

    expect(error?.code).toBe("42501");
  });
});

describe("organization A cannot delete from organization B", () => {
  it("deletes nothing in B's tables, and B's rows survive", async () => {
    const { alice, bob } = await setUp();

    const deletes = await Promise.all([
      alice.client.from("costs").delete().eq("id", bob.costId).select("id"),
      alice.client.from("documents").delete().eq("id", bob.documentId).select("id"),
      alice.client.from("invoices").delete().eq("id", bob.invoiceId).select("id"),
      alice.client.from("projects").delete().eq("id", bob.projectId).select("id"),
      alice.client.from("organizations").delete().eq("id", bob.user.orgId).select("id"),
    ]);

    deletes.forEach(expectNothing);
    for (const [table, id] of [
      ["costs", bob.costId],
      ["documents", bob.documentId],
      ["invoices", bob.invoiceId],
      ["projects", bob.projectId],
      ["organizations", bob.user.orgId],
    ] as const) {
      const { count } = await admin.from(table).select("id", { count: "exact", head: true }).eq("id", id);
      expect(count).toBe(1);
    }
  });
});
