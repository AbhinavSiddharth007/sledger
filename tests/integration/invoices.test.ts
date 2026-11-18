import { afterEach, describe, expect, it } from "vitest";
import { admin, cleanUpUsers, createProject, createSignedInUser, type TestUser } from "../support/users";

afterEach(cleanUpUsers);

// Dates far in the future and far in the past, so the tests do not depend on today.
const FUTURE = { issuedAt: "2030-01-10", dueAt: "2030-02-10" };
const PAST = { issuedAt: "2024-01-10", dueAt: "2024-02-10" };

async function createInvoice(user: TestUser, projectId: string, dates = FUTURE, amountCents = 100_000) {
  const { data, error } = await user.client.rpc("create_invoice", {
    p_project_id: projectId,
    p_amount_cents: amountCents,
    p_issued_at: dates.issuedAt,
    p_due_at: dates.dueAt,
  });
  if (error) throw error;
  return data as string;
}

async function invoiceRow(invoiceId: string) {
  const { data, error } = await admin
    .from("invoices")
    .select("number, status, paid_at, amount_cents, due_at")
    .eq("id", invoiceId)
    .single();
  if (error) throw error;
  return data;
}

async function setStatus(user: TestUser, invoiceId: string, status: string) {
  return user.client.from("invoices").update({ status }).eq("id", invoiceId).select("id");
}

describe("invoice numbers under concurrency", () => {
  it("give every invoice created at the same moment a different number", async () => {
    const user = await createSignedInUser();
    const projectId = await createProject(user.orgId);

    const ids = await Promise.all(Array.from({ length: 10 }, () => createInvoice(user, projectId)));

    const { data } = await admin.from("invoices").select("number").in("id", ids);
    const numbers = data!.map((row) => row.number).sort();
    expect(new Set(numbers).size).toBe(10);
    expect(numbers).toEqual(Array.from({ length: 10 }, (_, index) => `INV-2030-${String(index + 1).padStart(4, "0")}`));
  });

  it("give two members of one organization different numbers when they create at once", async () => {
    const owner = await createSignedInUser();
    const projectId = await createProject(owner.orgId);
    const memberUser = await createSignedInUser();
    await admin.from("org_members").insert({ org_id: owner.orgId, user_id: memberUser.userId, role: "member" });

    const ids = await Promise.all([
      ...Array.from({ length: 5 }, () => createInvoice(owner, projectId)),
      ...Array.from({ length: 5 }, () => createInvoice(memberUser, projectId)),
    ]);

    const { data } = await admin.from("invoices").select("number").in("id", ids);
    expect(new Set(data!.map((row) => row.number)).size).toBe(10);
  });

  it("number each organization separately, so two organizations both start at 0001", async () => {
    const alice = await createSignedInUser();
    const bob = await createSignedInUser();
    const alicesProject = await createProject(alice.orgId);
    const bobsProject = await createProject(bob.orgId);

    const alicesInvoice = await createInvoice(alice, alicesProject);
    const bobsInvoice = await createInvoice(bob, bobsProject);

    expect((await invoiceRow(alicesInvoice)).number).toBe("INV-2030-0001");
    expect((await invoiceRow(bobsInvoice)).number).toBe("INV-2030-0001");
  });

  it("leave no gap when an invoice fails to save, because the number is given back with it", async () => {
    const user = await createSignedInUser();
    const projectId = await createProject(user.orgId);

    const { error } = await user.client.rpc("create_invoice", {
      p_project_id: projectId,
      p_amount_cents: -1,
      p_issued_at: FUTURE.issuedAt,
      p_due_at: FUTURE.dueAt,
    });
    expect(error).not.toBeNull();

    const next = await createInvoice(user, projectId);
    expect((await invoiceRow(next)).number).toBe("INV-2030-0001");
  });

  it("refuse to create an invoice in a project the caller cannot see", async () => {
    const alice = await createSignedInUser();
    const bob = await createSignedInUser();
    const bobsProject = await createProject(bob.orgId);

    const { error } = await alice.client.rpc("create_invoice", {
      p_project_id: bobsProject,
      p_amount_cents: 100,
      p_issued_at: FUTURE.issuedAt,
      p_due_at: FUTURE.dueAt,
    });

    expect(error?.message).toBe("Project not found");
  });
});

describe("invoice status flow", () => {
  it("moves draft to sent, then to paid, and records the payment date", async () => {
    const user = await createSignedInUser();
    const invoiceId = await createInvoice(user, await createProject(user.orgId));

    expect((await setStatus(user, invoiceId, "sent")).error).toBeNull();
    expect((await setStatus(user, invoiceId, "paid")).error).toBeNull();

    const row = await invoiceRow(invoiceId);
    expect(row.status).toBe("paid");
    expect(row.paid_at).toBe(new Date().toISOString().slice(0, 10));
  });

  it("refuses to skip a step, such as draft straight to paid", async () => {
    const user = await createSignedInUser();
    const invoiceId = await createInvoice(user, await createProject(user.orgId));

    const { error } = await setStatus(user, invoiceId, "paid");

    expect(error?.message).toBe("An invoice cannot go from draft to paid");
    expect((await invoiceRow(invoiceId)).status).toBe("draft");
  });

  it("refuses to move backwards, or to change a paid invoice", async () => {
    const user = await createSignedInUser();
    const invoiceId = await createInvoice(user, await createProject(user.orgId));
    await setStatus(user, invoiceId, "sent");
    await setStatus(user, invoiceId, "paid");

    const back = await setStatus(user, invoiceId, "sent");
    const again = await setStatus(user, invoiceId, "overdue");

    expect(back.error?.message).toBe("An invoice cannot go from paid to sent");
    expect(again.error?.message).toBe("An invoice cannot go from paid to overdue");
  });

  it("refuses to mark an invoice overdue before its due date", async () => {
    const user = await createSignedInUser();
    const invoiceId = await createInvoice(user, await createProject(user.orgId));
    await setStatus(user, invoiceId, "sent");

    const { error } = await setStatus(user, invoiceId, "overdue");

    expect(error?.message).toBe("An invoice cannot go from sent to overdue");
  });

  it("marks sent invoices overdue once their due date has passed, and leaves the rest alone", async () => {
    const user = await createSignedInUser();
    const projectId = await createProject(user.orgId);
    const late = await createInvoice(user, projectId, PAST);
    const notYet = await createInvoice(user, projectId, FUTURE);
    const notSent = await createInvoice(user, projectId, PAST);
    await setStatus(user, late, "sent");
    await setStatus(user, notYet, "sent");

    const { data: marked, error } = await admin.rpc("mark_overdue_invoices");

    expect(error).toBeNull();
    expect(marked).toBeGreaterThanOrEqual(1);
    expect((await invoiceRow(late)).status).toBe("overdue");
    expect((await invoiceRow(notYet)).status).toBe("sent");
    expect((await invoiceRow(notSent)).status).toBe("draft");
  });

  it("lets an overdue invoice be paid", async () => {
    const user = await createSignedInUser();
    const invoiceId = await createInvoice(user, await createProject(user.orgId), PAST);
    await setStatus(user, invoiceId, "sent");
    await admin.rpc("mark_overdue_invoices");

    const { error } = await setStatus(user, invoiceId, "paid");

    expect(error).toBeNull();
    expect((await invoiceRow(invoiceId)).status).toBe("paid");
  });
});

describe("invoice editing and numbers", () => {
  it("lets a draft's amount and dates change", async () => {
    const user = await createSignedInUser();
    const invoiceId = await createInvoice(user, await createProject(user.orgId));

    const { data, error } = await user.client
      .from("invoices")
      .update({ amount_cents: 250_000, due_at: "2030-03-01" })
      .eq("id", invoiceId)
      .select("id");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect((await invoiceRow(invoiceId)).amount_cents).toBe(250_000);
  });

  it("refuses to change the amount or dates of a sent invoice", async () => {
    const user = await createSignedInUser();
    const invoiceId = await createInvoice(user, await createProject(user.orgId));
    await setStatus(user, invoiceId, "sent");

    const { error } = await user.client.from("invoices").update({ amount_cents: 1 }).eq("id", invoiceId);

    expect(error?.message).toBe("Only a draft invoice can be edited");
  });

  it("refuses to change an invoice number", async () => {
    const user = await createSignedInUser();
    const invoiceId = await createInvoice(user, await createProject(user.orgId));

    const { error } = await user.client.from("invoices").update({ number: "INV-X" }).eq("id", invoiceId);

    expect(error?.message).toBe("An invoice number cannot change");
  });

  it("refuses to insert a sent invoice directly", async () => {
    const user = await createSignedInUser();
    const projectId = await createProject(user.orgId);

    const { error } = await admin.from("invoices").insert({
      project_id: projectId, org_id: user.orgId, number: "INV-DIRECT", amount_cents: 1,
      issued_at: FUTURE.issuedAt, due_at: FUTURE.dueAt, status: "sent",
    });

    expect(error?.message).toBe("A new invoice starts as a draft");
  });
});
