import { afterEach, describe, expect, it } from "vitest";
import { addMember, admin, cleanUpUsers, countCosts, createProject, createSignedInUser, setRole } from "../support/users";

afterEach(cleanUpUsers);

async function orgWithCost() {
  const owner = await createSignedInUser();
  const projectId = await createProject(owner.orgId);
  await admin.from("costs").insert({
    project_id: projectId, org_id: owner.orgId, category: "other", supplier: "A", description: "x",
    amount_cents: 500, cost_date: "2025-01-01", source: "manual",
  });
  return { owner, projectId };
}

describe("members", () => {
  it("can read their organization's projects, costs and fellow members", async () => {
    const { owner, projectId } = await orgWithCost();
    const member = await createSignedInUser();
    await addMember(owner.orgId, member.userId, "member");

    const { data: projects } = await member.client.from("projects").select("id").eq("id", projectId);
    const { data: costs } = await member.client.from("costs").select("id").eq("project_id", projectId);
    const { data: members } = await member.client.from("org_members").select("user_id").eq("org_id", owner.orgId);

    expect(projects).toHaveLength(1);
    expect(costs).toHaveLength(1);
    expect(members?.map((row) => row.user_id).sort()).toEqual([owner.userId, member.userId].sort());
  });

  it("can add and change costs", async () => {
    const { owner, projectId } = await orgWithCost();
    const member = await createSignedInUser();
    await addMember(owner.orgId, member.userId, "member");

    const { error: insertError } = await member.client.from("costs").insert({
      project_id: projectId, org_id: owner.orgId, category: "labour", supplier: "B", description: "y",
      amount_cents: 700, cost_date: "2025-01-02", source: "manual",
    });
    const { error: updateError } = await member.client.from("costs").update({ amount_cents: 800 }).eq("project_id", projectId);

    expect(insertError).toBeNull();
    expect(updateError).toBeNull();
    expect(await countCosts(projectId)).toBe(2);
  });

  it("cannot delete a cost, and the cost stays", async () => {
    const { owner, projectId } = await orgWithCost();
    const member = await createSignedInUser();
    await addMember(owner.orgId, member.userId, "member");

    const { data, error } = await member.client.from("costs").delete().eq("project_id", projectId).select("id");

    expect(error).toBeNull();
    expect(data).toEqual([]);
    expect(await countCosts(projectId)).toBe(1);
  });
});

describe("owners and admins", () => {
  it("can delete costs", async () => {
    const { owner, projectId } = await orgWithCost();

    const { data } = await owner.client.from("costs").delete().eq("project_id", projectId).select("id");

    expect(data).toHaveLength(1);
    expect(await countCosts(projectId)).toBe(0);
  });

  it("let an admin delete projects", async () => {
    const { owner } = await orgWithCost();
    const admin2 = await createSignedInUser();
    await addMember(owner.orgId, admin2.userId, "admin");
    const projectId = await createProject(owner.orgId);

    const { data } = await admin2.client.from("projects").delete().eq("id", projectId).select("id");

    expect(data).toHaveLength(1);
  });

  it("stop a demoted admin from deleting", async () => {
    const { owner, projectId } = await orgWithCost();
    const user = await createSignedInUser();
    await addMember(owner.orgId, user.userId, "admin");
    await setRole(owner.orgId, user.userId, "member");

    const { data } = await user.client.from("costs").delete().eq("project_id", projectId).select("id");

    expect(data).toEqual([]);
    expect(await countCosts(projectId)).toBe(1);
  });
});
