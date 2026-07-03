import { expect, test } from "@playwright/test";

test("top page renders under the shared e2e server", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/fx-journal-mvp/);
  await expect(page.locator("body")).toContainText("FX Journal");
});
