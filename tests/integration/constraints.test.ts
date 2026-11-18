import { afterEach, describe, expect, it } from "vitest";
import { admin, cleanUpUsers, createProject, createSignedInUser } from "../support/users";

afterEach(cleanUpUsers);

describe("database constraints", () => {
  it("rejects a negative amount", async () => {
    const user = await createSignedInUser();
    const projectId = await createProject(user.orgId);

    const { error } = await admin.from("costs").insert({
      project_id: projectId, org_id: user.orgId, category: "other", supplier: "A", description: "x",
      amount_cents: -1, cost_date: "2025-01-01", source: "manual",
    });

    expect(error).not.toBeNull();
  });

  it("rejects a category outside the allowed list", async () => {
    const user = await createSignedInUser();
    const projectId = await createProject(user.orgId);

    const { error } = await admin.from("costs").insert({
      project_id: projectId, org_id: user.orgId, category: "snacks", supplier: "A", description: "x",
      amount_cents: 100, cost_date: "2025-01-01", source: "manual",
    });

    expect(error).not.toBeNull();
  });

  it("takes a cost's organization from its project, whatever the insert says", async () => {
    const alice = await createSignedInUser();
    const bob = await createSignedInUser();
    const alicesProject = await createProject(alice.orgId);

    const { data } = await admin.from("costs").insert({
      project_id: alicesProject, org_id: bob.orgId, category: "other", supplier: "A",
      description: "x", amount_cents: 100, cost_date: "2025-01-01", source: "manual",
    }).select("org_id").single();

    expect(data?.org_id).toBe(alice.orgId);
  });
});
