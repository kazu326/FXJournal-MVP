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

  await page.goto("/lecture-notes");
  await expect(page.getByTestId("lecture-page")).toBeVisible();
});

test("lecture page keeps the shared navigation and a learner-friendly empty state", async ({
  page,
}) => {
  await expect(page.getByRole("button", { name: "講義" })).toBeVisible();
  await expect(page.getByTestId("lecture-empty-state")).toContainText(
    "講義を準備中です",
  );
  await expect(page.getByTestId("lecture-empty-state")).not.toContainText("DB");

  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    navigatorVisible: Boolean(
      document.querySelector("div.fixed.bottom-0")?.getBoundingClientRect()
        .height,
    ),
  }));

  expect(layout.documentWidth).toBe(layout.viewportWidth);
  expect(layout.navigatorVisible).toBe(true);

  await page.getByRole("button", { name: "ホーム" }).click();
  await expect(page).toHaveURL("/");
});

test("lecture page prioritizes the next lesson and keeps course states clear", async ({
  page,
}) => {
  await page.goto("/lecture-notes?e2e-scenario=lecture-progress");

  await expect(page.getByTestId("lecture-summary")).toContainText("1 / 4 完了");
  await expect(page.getByTestId("lecture-next")).toContainText("続きから学ぶ");
  await expect(page.getByTestId("continue-lecture-card")).toContainText(
    "損失を限定する考え方",
  );

  const items = page.getByTestId("lecture-item");
  await expect(items).toHaveCount(4);
  await expect(page.locator('[data-status="completed"]')).toHaveCount(1);
  await expect(page.locator('[data-status="in_progress"]')).toHaveCount(1);
  await expect(page.locator('[data-status="locked"]')).toHaveCount(2);

  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    navigatorVisible: Boolean(
      document.querySelector("div.fixed.bottom-0")?.getBoundingClientRect()
        .height,
    ),
  }));

  expect(layout.documentWidth).toBe(layout.viewportWidth);
  expect(layout.navigatorVisible).toBe(true);
});
