import { afterEach, describe, expect, it } from "vitest";
import { anonymousClient, cleanUpUsers, createDocument, createProject, createSignedInUser, admin } from "../support/users";

afterEach(cleanUpUsers);

describe("sign-up", () => {
  it("gives each new user a workspace of its own, with the user as owner", async () => {
    const user = await createSignedInUser();

    const { data, error } = await user.client.from("org_members").select("org_id, role");

    expect(error).toBeNull();
    expect(data).toEqual([{ org_id: user.orgId, role: "owner" }]);
  });
});

describe("organization isolation", () => {
  it("shows a user only the projects in its own workspace", async () => {
    const alice = await createSignedInUser();
    const bob = await createSignedInUser();
    const alicesProject = await createProject(alice.orgId);
    const bobsProject = await createProject(bob.orgId);

    const { data, error } = await alice.client.from("projects").select("id");

    expect(error).toBeNull();
    expect(data?.map((row) => row.id)).toContain(alicesProject);
    expect(data?.map((row) => row.id)).not.toContain(bobsProject);
  });

  it("hides another workspace's documents and costs", async () => {
    const alice = await createSignedInUser();
    const bob = await createSignedInUser();
    const bobsProject = await createProject(bob.orgId);
    const bobsDocument = await createDocument(bobsProject, "extracted");
    await admin.from("costs").insert({
      project_id: bobsProject, org_id: bob.orgId, category: "other", supplier: "B", description: "x",
      amount_cents: 500, cost_date: "2025-01-01", source: "manual",
    });

    const { data: costs } = await alice.client.from("costs").select("id").eq("project_id", bobsProject);
    const { data: document } = await alice.client.from("documents").select("id").eq("id", bobsDocument);

    expect(costs).toEqual([]);
    expect(document).toEqual([]);
  });

  it("refuses to write a cost into another workspace's project", async () => {
    const alice = await createSignedInUser();
    const bob = await createSignedInUser();
    const bobsProject = await createProject(bob.orgId);

    const { error } = await alice.client.from("costs").insert({
      project_id: bobsProject, org_id: bob.orgId, category: "other", supplier: "A", description: "x",
      amount_cents: 500, cost_date: "2025-01-01", source: "manual",
    });

    expect(error?.code).toBe("42501");
  });

  it("refuses to move one of its own projects into another workspace", async () => {
    const alice = await createSignedInUser();
    const bob = await createSignedInUser();
    const alicesProject = await createProject(alice.orgId);

    const { error } = await alice.client.from("projects").update({ org_id: bob.orgId }).eq("id", alicesProject);

    expect(error?.code).toBe("42501");
    const { data } = await admin.from("projects").select("org_id").eq("id", alicesProject).single();
    expect(data?.org_id).toBe(alice.orgId);
  });

  it("does not let a user confirm or start documents in another workspace", async () => {
    const alice = await createSignedInUser();
    const bob = await createSignedInUser();
    const bobsProject = await createProject(bob.orgId);
    const bobsDocument = await createDocument(bobsProject, "extracted");

    const { data: confirmed } = await alice.client.rpc("confirm_receipt", {
      p_project_id: bobsProject,
      p_document_id: bobsDocument,
      p_category: "other",
      p_supplier: "A",
      p_description: "x",
      p_amount_cents: 500,
      p_vat_cents: 0,
      p_cost_date: "2025-01-01",
      p_status: "confirmed",
    });
    const { error: started } = await alice.client.rpc("start_document", {
      p_project_id: bobsProject,
      p_file_url: "x.png",
      p_content_hash: "b".repeat(64),
    });

    expect(confirmed).toBeNull();
    expect(started?.code).toBe("42501");
    const { data } = await admin.from("documents").select("status").eq("id", bobsDocument).single();
    expect(data?.status).toBe("extracted");
  });

  it("shows a user only its own membership and organization", async () => {
    const alice = await createSignedInUser();
    await createSignedInUser();

    const { data: organizations } = await alice.client.from("organizations").select("id");
    const { data: members } = await alice.client.from("org_members").select("org_id");

    expect(organizations?.map((row) => row.id)).toEqual([alice.orgId]);
    expect(members?.map((row) => row.org_id)).toEqual([alice.orgId]);
  });
});

describe("membership changes", () => {
  it("do not let a user add itself to another organization", async () => {
    const alice = await createSignedInUser();
    const bob = await createSignedInUser();

    const { error } = await alice.client
      .from("org_members")
      .insert({ org_id: bob.orgId, user_id: alice.userId, role: "owner" });

    expect(error?.code).toBe("42501");
    const { data } = await admin.from("org_members").select("user_id").eq("org_id", bob.orgId);
    expect(data?.map((row) => row.user_id)).toEqual([bob.userId]);
  });

  it("do not let a user rename its organization", async () => {
    const alice = await createSignedInUser();

    const { error } = await alice.client.from("organizations").update({ name: "Hijacked" }).eq("id", alice.orgId);

    expect(error?.code).toBe("42501");
  });
});

describe("publishable key", () => {
  it("cannot read tables or call the receipt functions without signing in", async () => {
    const anon = anonymousClient();
    const user = await createSignedInUser();
    const project = await createProject(user.orgId);

    const { error: readError } = await anon.from("projects").select("id");
    const { error: rpcError } = await anon.rpc("start_document", {
      p_project_id: project,
      p_file_url: "x.png",
      p_content_hash: "c".repeat(64),
    });

    expect(readError?.code).toBe("42501");
    expect(rpcError).not.toBeNull();
  });
});

describe("demo workspace", () => {
  it("lets the seeded demo user sign in and see the sample projects", async () => {
    const demo = anonymousClient();
    const { error: signInError } = await demo.auth.signInWithPassword({
      email: "demo@sledger.test",
      password: "sledger-demo",
    });
    expect(signInError).toBeNull();

    const { data } = await demo.from("projects").select("name");

    expect(data?.map((row) => row.name)).toEqual(
      expect.arrayContaining(["Reforma integral piso Calle Alcalá 45", "Ampliación nave logística Getafe"]),
    );
  });
});
