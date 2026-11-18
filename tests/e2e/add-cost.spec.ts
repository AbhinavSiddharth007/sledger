import { expect, test } from "@playwright/test";
import { createTestProject, removeTestProject, signIn } from "./support";

let projectId: string;

test.beforeEach(async () => {
  projectId = (await createTestProject()).id;
});

test.afterEach(async () => {
  await removeTestProject(projectId);
});

test("a cost can be added and then appears in the project", async ({ page }) => {
  await signIn(page);
  await page.goto(`/projects/${projectId}`);
  await page.getByRole("link", { name: "Add cost" }).click();

  await expect(page).toHaveURL(/\/costs\/new$/);
  await page.getByLabel("Supplier").fill("E2E Ferretería");
  await page.getByLabel("Description").fill("Cable de cobre");
  await page.getByLabel("Net amount (€)").fill("123.45");
  await page.getByLabel("Date").fill("2025-03-10");
  await page.getByRole("button", { name: "Save cost" }).click();

  await expect(page).toHaveURL(new RegExp(`/projects/${projectId}$`));
  await expect(page.getByRole("cell", { name: "E2E Ferretería" })).toBeVisible();
});

test("a bad amount is marked on its field, which takes focus", async ({ page }) => {
  await signIn(page);
  await page.goto(`/projects/${projectId}/costs/new`);
  await page.getByLabel("Supplier").fill("E2E Supplier");
  await page.getByLabel("Description").fill("Bad amount");
  await page.getByLabel("Net amount (€)").fill("12.345");
  await page.getByLabel("Date").fill("2025-03-10");
  await page.getByRole("button", { name: "Save cost" }).click();

  const amount = page.getByLabel("Net amount (€)");
  await expect(amount).toHaveAttribute("aria-invalid", "true");
  await expect(amount).toBeFocused();
  await expect(amount).toHaveAccessibleDescription(/1234\.56/);
});
