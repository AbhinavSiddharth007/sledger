import { afterEach, describe, expect, it } from "vitest";
import { admin, cleanUpUsers, createProject, createSignedInUser } from "../support/users";

afterEach(cleanUpUsers);

describe("database constraints", () => {
  it("rejects a negative amount", async () => {
    const user = await createSignedInUser();
    const projectId = await createProject(user.tenantId);

    const { error } = await admin.from("costs").insert({
      project_id: projectId, tenant_id: user.tenantId, category: "other", supplier: "A", description: "x",
      amount_cents: -1, cost_date: "2025-01-01", source: "manual",
    });

    expect(error).not.toBeNull();
  });

  it("rejects a category outside the allowed list", async () => {
    const user = await createSignedInUser();
    const projectId = await createProject(user.tenantId);

    const { error } = await admin.from("costs").insert({
      project_id: projectId, tenant_id: user.tenantId, category: "snacks", supplier: "A", description: "x",
      amount_cents: 100, cost_date: "2025-01-01", source: "manual",
    });

    expect(error).not.toBeNull();
  });

  it("takes a cost's tenant from its project, whatever the insert says", async () => {
    const alice = await createSignedInUser();
    const bob = await createSignedInUser();
    const alicesProject = await createProject(alice.tenantId);

    const { data } = await admin.from("costs").insert({
      project_id: alicesProject, tenant_id: bob.tenantId, category: "other", supplier: "A",
      description: "x", amount_cents: 100, cost_date: "2025-01-01", source: "manual",
    }).select("tenant_id").single();

    expect(data?.tenant_id).toBe(alice.tenantId);
  });
});
