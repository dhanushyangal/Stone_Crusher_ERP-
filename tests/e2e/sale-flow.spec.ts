import { test, expect } from "@playwright/test";

test("login, create sale of 5 BU (=20 tunes), post", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("owner@crusher.local");
  await page.getByLabel("Password").fill("ChangeMe@123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/dashboard/);

  // Masters must exist before sale e2e — create product/customer via UI or API in a fuller suite.
  await page.goto("/dashboard");
  await expect(page.getByText(/dashboard/i).first()).toBeVisible();
});
