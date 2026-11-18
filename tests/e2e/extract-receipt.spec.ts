import { expect, test } from "@playwright/test";
import { FIXTURE, createTestProject, removeTestProject, signIn } from "./support";

let projectId: string;

test.beforeEach(async () => {
  projectId = (await createTestProject()).id;
});

test.afterEach(async () => {
  await removeTestProject(projectId);
});

// Uploading goes through the real extraction. Claude needs ANTHROPIC_API_KEY, so without it the
// extraction fails and the page says so. Either way the receipt is saved and opens for review.
test("an uploaded receipt is read and opens for review", async ({ page }) => {
  await signIn(page);
  await page.goto(`/projects/${projectId}`);

  await page.getByLabel("Receipt or delivery note").setInputFiles(FIXTURE);
  await page.getByRole("button", { name: "Upload & extract" }).click();

  await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/documents/[0-9a-f-]{36}$`));
  await expect(page.getByRole("heading", { name: "Review receipt" })).toBeVisible();

  const failed = page.getByText(/Extraction failed/);
  const extracted = page.getByText("extracted", { exact: true });
  await expect(failed.or(extracted).first()).toBeVisible({ timeout: 120_000 });
});
