import { expect, test } from "@playwright/test";
import { signIn } from "./support";

// Pages must fit a phone screen without sideways scrolling.
test.use({ viewport: { width: 390, height: 844 } });

test("the projects list fits a phone screen", async ({ page }) => {
  await signIn(page);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("the project dashboard fits a phone screen and shows its charts", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Reforma integral piso Calle Alcalá 45" }).click();

  await expect(page.getByRole("img", { name: /Budget vs spent/ })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
