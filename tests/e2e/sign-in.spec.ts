import { expect, test } from "@playwright/test";
import { DEMO, signIn } from "./support";

test("a signed-out visitor is sent to the sign-in page", async ({ page }) => {
  await page.goto("/projects");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in to Sledger" })).toBeVisible();
});

test("a wrong password is reported next to the form", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").first().fill(DEMO.email);
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("alert")).toContainText(/invalid login credentials/i);
  await expect(page).toHaveURL(/\/login/);
});

test("the demo user signs in and lands on its projects", async ({ page }) => {
  await signIn(page);

  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await expect(page.getByText(DEMO.email)).toBeVisible();
});
