import { afterEach, describe, expect, it } from "vitest";
import { admin, cleanUpUsers, countCosts, createDocument, createProject, createSignedInUser } from "../support/users";

// The receipt functions run as the signed-in owner, so these also exercise RLS.
afterEach(cleanUpUsers);

const HASH = "a".repeat(64);

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

async function documentStatus(documentId: string) {
  const { data } = await admin.from("documents").select("status").eq("id", documentId).single();
  return data?.status;
}

describe("confirm_receipt", () => {
  it("turns an extracted receipt into one cost, owned by the project's workspace", async () => {
    const user = await createSignedInUser();
    const projectId = await createProject(user.tenantId);
    const documentId = await createDocument(projectId, "extracted");

    const { data: costId, error } = await user.client.rpc("confirm_receipt", confirmArgs(projectId, documentId));

    expect(error).toBeNull();
    expect(costId).toEqual(expect.any(String));
    expect(await documentStatus(documentId)).toBe("confirmed");
    expect(await countCosts(projectId)).toBe(1);

    const { data: cost } = await admin.from("costs").select("source, status, amount_cents, tenant_id").eq("id", costId!).single();
    expect(cost).toEqual({ source: "ai_extracted", status: "needs_review", amount_cents: 186400, tenant_id: user.tenantId });
  });

  it("is idempotent: a second confirm inserts nothing and returns null", async () => {
    const user = await createSignedInUser();
    const projectId = await createProject(user.tenantId);
    const documentId = await createDocument(projectId, "pending");

    await user.client.rpc("confirm_receipt", confirmArgs(projectId, documentId));
    const { data: second, error } = await user.client.rpc("confirm_receipt", confirmArgs(projectId, documentId));

    expect(error).toBeNull();
    expect(second).toBeNull();
    expect(await countCosts(projectId)).toBe(1);
  });

  it("does not confirm a rejected document", async () => {
    const user = await createSignedInUser();
    const projectId = await createProject(user.tenantId);
    const documentId = await createDocument(projectId, "rejected");

    const { data } = await user.client.rpc("confirm_receipt", confirmArgs(projectId, documentId));

    expect(data).toBeNull();
    expect(await countCosts(projectId)).toBe(0);
  });

  it("rolls back the claim when the cost is invalid", async () => {
    const user = await createSignedInUser();
    const projectId = await createProject(user.tenantId);
    const documentId = await createDocument(projectId, "extracted");

    const { error } = await user.client.rpc(
      "confirm_receipt",
      confirmArgs(projectId, documentId, { p_amount_cents: -1 }),
    );

    expect(error).not.toBeNull();
    expect(await documentStatus(documentId)).toBe("extracted");
    expect(await countCosts(projectId)).toBe(0);
  });
});

describe("start_document", () => {
  it("creates a document, then returns the same one for the same file", async () => {
    const user = await createSignedInUser();
    const projectId = await createProject(user.tenantId);
    const args = { p_project_id: projectId, p_file_url: `${projectId}/a.png`, p_content_hash: HASH };

    const { data: first, error: firstError } = await user.client.rpc("start_document", args);
    const { data: second, error: secondError } = await user.client.rpc("start_document", args);

    expect(firstError).toBeNull();
    expect(secondError).toBeNull();
    expect(first?.[0]).toMatchObject({ created: true });
    expect(second).toEqual([{ document_id: first?.[0].document_id, created: false }]);
  });

  it("treats the same file in another workspace's project as a new document", async () => {
    const alice = await createSignedInUser();
    const bob = await createSignedInUser();
    const alicesProject = await createProject(alice.tenantId);
    const bobsProject = await createProject(bob.tenantId);

    await alice.client.rpc("start_document", { p_project_id: alicesProject, p_file_url: "a.png", p_content_hash: HASH });
    const { data } = await bob.client.rpc("start_document", { p_project_id: bobsProject, p_file_url: "b.png", p_content_hash: HASH });

    expect(data?.[0]).toMatchObject({ created: true });
  });

  it("rejects a hash that is not 64 lowercase hex characters", async () => {
    const user = await createSignedInUser();
    const projectId = await createProject(user.tenantId);

    const { error } = await user.client.rpc("start_document", {
      p_project_id: projectId, p_file_url: "x.png", p_content_hash: "ABC",
    });

    expect(error).not.toBeNull();
  });
});

describe("record_extraction", () => {
  it("writes the result and moves a pending document to extracted", async () => {
    const user = await createSignedInUser();
    const projectId = await createProject(user.tenantId);
    const documentId = await createDocument(projectId, "pending");

    const { data: written, error } = await user.client.rpc("record_extraction", {
      p_project_id: projectId,
      p_document_id: documentId,
      p_raw_extraction: { model: "test", attempts: [] },
      p_confidence: 0.91,
      p_status: "extracted",
    });

    expect(error).toBeNull();
    expect(written).toBe(true);
    const { data } = await admin.from("documents").select("status, confidence").eq("id", documentId).single();
    expect(data).toEqual({ status: "extracted", confidence: 0.91 });
  });

  it("keeps a failed extraction pending, with the error recorded", async () => {
    const user = await createSignedInUser();
    const projectId = await createProject(user.tenantId);
    const documentId = await createDocument(projectId, "pending");

    const { data: written } = await user.client.rpc("record_extraction", {
      p_project_id: projectId,
      p_document_id: documentId,
      p_raw_extraction: { model: "test", attempts: [], error: "timeout" },
    });

    expect(written).toBe(true);
    const { data } = await admin.from("documents").select("status, raw_extraction").eq("id", documentId).single();
    expect(data?.status).toBe("pending");
    expect(data?.raw_extraction).toMatchObject({ error: "timeout" });
  });

  it("never overwrites a document that was already confirmed or rejected", async () => {
    const user = await createSignedInUser();
    const projectId = await createProject(user.tenantId);
    const documentId = await createDocument(projectId, "rejected");

    const { data: written } = await user.client.rpc("record_extraction", {
      p_project_id: projectId,
      p_document_id: documentId,
      p_raw_extraction: { model: "late" },
      p_confidence: 0.99,
      p_status: "extracted",
    });

    expect(written).toBe(false);
    expect(await documentStatus(documentId)).toBe("rejected");
  });
});
