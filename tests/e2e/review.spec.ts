import { expect, test } from "@playwright/test";
import { createExtractedReceipt, createTestProject, removeTestProject, signIn } from "./support";

let projectId: string;
let orgId: string;

test.beforeEach(async () => {
  ({ id: projectId, orgId } = await createTestProject());
});

test.afterEach(async () => {
  await removeTestProject(projectId);
});

test("a reviewed receipt is confirmed as a cost", async ({ page }) => {
  const documentId = await createExtractedReceipt(projectId, orgId, "Ferretería E2E");
  await signIn(page);
  await page.goto(`/projects/${projectId}/documents/${documentId}`);

  await expect(page.getByLabel("Supplier")).toHaveValue("Ferretería E2E");
  await page.getByRole("button", { name: "Confirm cost" }).click();

  await expect(page).toHaveURL(new RegExp(`/projects/${projectId}$`));
  await expect(page.getByRole("cell", { name: "Ferretería E2E" })).toBeVisible();
});

test("rejecting a receipt updates the page at once", async ({ page }) => {
  const documentId = await createExtractedReceipt(projectId, orgId, "Rejected supplier");
  await signIn(page);
  await page.goto(`/projects/${projectId}/documents/${documentId}`);

  await page.getByRole("button", { name: "Reject this receipt" }).click();

  await expect(page.getByRole("status").filter({ hasText: "already been rejected" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm cost" })).toHaveCount(0);
});
