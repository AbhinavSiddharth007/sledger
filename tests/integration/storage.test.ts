import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { isAlreadyStored, receiptPath } from "@/lib/storage";
import { addMember, admin, cleanUpUsers, createProject, createSignedInUser, type TestUser } from "../support/users";

afterEach(cleanUpUsers);

const FIXTURE = readFileSync(path.join(__dirname, "..", "e2e", "fixtures", "receipt.png"));
const HASH = "c".repeat(64);

// A receipt in an organization's project folder, uploaded as the given user.
const pathFor = (orgId: string, projectId: string, hash = HASH) => receiptPath(orgId, projectId, hash, "image/png");

async function setUp() {
  const alice = await createSignedInUser();
  const bob = await createSignedInUser();
  const alicesProject = await createProject(alice.orgId);
  const bobsProject = await createProject(bob.orgId);
  return { alice, bob, alicesProject, bobsProject };
}

describe("uploads", () => {
  it("let a member store a receipt in its own organization's project", async () => {
    const { alice, alicesProject } = await setUp();

    const { error } = await alice.client.storage
      .from("receipts")
      .upload(pathFor(alice.orgId, alicesProject), FIXTURE, { contentType: "image/png" });

    expect(error).toBeNull();
  });

  it("refuse to store a receipt in another organization's folder", async () => {
    const { alice, bobsProject, bob } = await setUp();

    const { error } = await alice.client.storage
      .from("receipts")
      .upload(pathFor(bob.orgId, bobsProject), FIXTURE, { contentType: "image/png" });

    expect(error).not.toBeNull();
  });

  it("refuse to file a receipt under a project that belongs to another organization", async () => {
    const { alice, bobsProject } = await setUp();

    const { error } = await alice.client.storage
      .from("receipts")
      .upload(pathFor(alice.orgId, bobsProject), FIXTURE, { contentType: "image/png" });

    expect(error).not.toBeNull();
  });

  it("refuse a second copy of the same file, which is how duplicates are detected", async () => {
    const { alice, alicesProject } = await setUp();
    const target = pathFor(alice.orgId, alicesProject);
    await alice.client.storage.from("receipts").upload(target, FIXTURE, { contentType: "image/png" });

    const { error } = await alice.client.storage
      .from("receipts")
      .upload(target, FIXTURE, { contentType: "image/png" });

    expect(error).not.toBeNull();
    expect(isAlreadyStored(error!)).toBe(true);
  });

  it("refuse a file over 10 MB, whatever the app checks", async () => {
    const { alice, alicesProject } = await setUp();
    const tooBig = Buffer.alloc(10 * 1024 * 1024 + 1, 1);

    const { error } = await alice.client.storage
      .from("receipts")
      .upload(pathFor(alice.orgId, alicesProject, "d".repeat(64)), tooBig, { contentType: "image/png" });

    expect(error).not.toBeNull();
  });

  it("refuse a type the bucket does not store", async () => {
    const { alice, alicesProject } = await setUp();

    const { error } = await alice.client.storage
      .from("receipts")
      .upload(`${alice.orgId}/${alicesProject}/${"e".repeat(64)}.html`, Buffer.from("<html>"), {
        contentType: "text/html",
      });

    expect(error).not.toBeNull();
  });

  it("refuse an anonymous visitor", async () => {
    const { alicesProject, alice } = await setUp();
    const { anonymousClient } = await import("../support/users");

    const { error } = await anonymousClient().storage
      .from("receipts")
      .upload(pathFor(alice.orgId, alicesProject), FIXTURE, { contentType: "image/png" });

    expect(error).not.toBeNull();
  });
});

describe("reads", () => {
  it("give a member a signed link that opens its own organization's receipt", async () => {
    const { alice, alicesProject } = await setUp();
    const target = pathFor(alice.orgId, alicesProject);
    await alice.client.storage.from("receipts").upload(target, FIXTURE, { contentType: "image/png" });

    const { data, error } = await alice.client.storage.from("receipts").createSignedUrl(target, 60);
    const response = await fetch(data!.signedUrl);

    expect(error).toBeNull();
    expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer()).equals(FIXTURE)).toBe(true);
  });

  it("refuse another organization a signed link to the receipt", async () => {
    const { alice, bob, alicesProject } = await setUp();
    const target = pathFor(alice.orgId, alicesProject);
    await alice.client.storage.from("receipts").upload(target, FIXTURE, { contentType: "image/png" });

    const { data, error } = await bob.client.storage.from("receipts").createSignedUrl(target, 60);

    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("show another organization none of the receipts in this organization's folder", async () => {
    const { alice, bob, alicesProject } = await setUp();
    await alice.client.storage
      .from("receipts")
      .upload(pathFor(alice.orgId, alicesProject), FIXTURE, { contentType: "image/png" });

    const { data } = await bob.client.storage.from("receipts").list(`${alice.orgId}/${alicesProject}`);

    expect(data).toEqual([]);
  });
});

describe("deletes", () => {
  async function storedReceipt(user: TestUser, projectId: string) {
    const target = pathFor(user.orgId, projectId);
    await user.client.storage.from("receipts").upload(target, FIXTURE, { contentType: "image/png" });
    return target;
  }

  async function stillThere(target: string) {
    const folder = target.split("/").slice(0, 2).join("/");
    const { data } = await admin.storage.from("receipts").list(folder);
    return (data ?? []).some((file) => `${folder}/${file.name}` === target);
  }

  it("refuse a plain member, which removes nothing", async () => {
    const { alice, alicesProject } = await setUp();
    const member = await createSignedInUser();
    await addMember(alice.orgId, member.userId, "member");
    const target = await storedReceipt(alice, alicesProject);

    await member.client.storage.from("receipts").remove([target]);

    expect(await stillThere(target)).toBe(true);
  });

  it("let an owner remove a receipt from its organization", async () => {
    const { alice, alicesProject } = await setUp();
    const target = await storedReceipt(alice, alicesProject);

    const { error } = await alice.client.storage.from("receipts").remove([target]);

    expect(error).toBeNull();
    expect(await stillThere(target)).toBe(false);
  });
});
