import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem("fxj_e2e_scenario", "default");
    window.localStorage.setItem("fxj_test_mode", "0");
    window.localStorage.setItem("hasSeenInstallPrompt", "true");
  });

  await page.goto("/mypage");
  await expect(page.getByTestId("mypage")).toBeVisible();
});

test("mypage keeps one clear action and fits the mobile viewport", async ({
  page,
}) => {
  await expect(page.getByTestId("mypage-level")).toHaveText("Level1");
  await expect(page.getByTestId("mypage-indicator")).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(page.getByTestId("mypage-badges")).toContainText("準備中");
  await expect(page.getByTestId("mypage-calendar")).toContainText("準備中");

  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    documentWidth: document.documentElement.scrollWidth,
    documentHeight: document.documentElement.scrollHeight,
  }));

  expect(layout.documentWidth).toBe(layout.viewportWidth);
  expect(layout.documentHeight).toBeLessThanOrEqual(layout.viewportHeight);

  await page.getByTestId("mypage-learning").click();
  await expect(page).toHaveURL("/learning-contents");
});
