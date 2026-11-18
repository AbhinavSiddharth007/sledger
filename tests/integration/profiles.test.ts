import { afterEach, describe, expect, it } from "vitest";
import { admin, cleanUpUsers, createSignedInUser } from "../support/users";

afterEach(cleanUpUsers);

describe("profiles", () => {
  it("are created for each new user by a trigger on auth.users", async () => {
    const user = await createSignedInUser();

    const { data, error } = await admin.from("profiles").select("email").eq("id", user.userId).single();

    expect(error).toBeNull();
    expect(data?.email).toEqual(expect.stringContaining("@test.local"));
  });

  it("let a user read its own profile, and no one else's", async () => {
    const alice = await createSignedInUser();
    const bob = await createSignedInUser();

    const { data } = await alice.client.from("profiles").select("id");

    expect(data?.map((row) => row.id)).toEqual([alice.userId]);
    expect(data?.map((row) => row.id)).not.toContain(bob.userId);
  });

  it("let a user change its name but not its email", async () => {
    const user = await createSignedInUser();

    const { error: nameError } = await user.client
      .from("profiles")
      .update({ full_name: "Alice Example" })
      .eq("id", user.userId);
    const { error: emailError } = await user.client
      .from("profiles")
      .update({ email: "someone-else@test.local" })
      .eq("id", user.userId);

    expect(nameError).toBeNull();
    expect(emailError?.code).toBe("42501");
    const { data } = await admin.from("profiles").select("full_name").eq("id", user.userId).single();
    expect(data?.full_name).toBe("Alice Example");
  });
});

describe("organization roles", () => {
  it("make the creator of a new workspace its owner", async () => {
    const user = await createSignedInUser();

    const { data } = await admin.from("org_members").select("role").eq("user_id", user.userId).single();

    expect(data?.role).toBe("owner");
  });

  it("accept owner, admin and member, and nothing else", async () => {
    const user = await createSignedInUser();

    const { error: promoted } = await admin.from("org_members").update({ role: "admin" }).eq("user_id", user.userId);
    const { error: unknownRole } = await admin.from("org_members").update({ role: "superuser" }).eq("user_id", user.userId);

    expect(promoted).toBeNull();
    expect(unknownRole).not.toBeNull();
  });
});
