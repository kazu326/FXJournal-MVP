import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem("fxj_e2e_scenario", "analysis-data");
    window.localStorage.setItem("fxj_test_mode", "0");
    window.localStorage.setItem("hasSeenInstallPrompt", "true");
  });
});

test("desktop analysis summarizes records and downloads the privacy-safe schema", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/analysis");

  await expect(page.getByTestId("analysis-page")).toBeVisible();
  await expect(page.getByText("記録を分析する")).toBeVisible();
  await expect(page.getByText("取引 2・見送り 1")).toBeVisible();
  await expect(page.getByText("67%")).toBeVisible();
  await expect(page.getByText("50%")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("analysis-download").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^fxjournal_analysis_30d_\d{4}-\d{2}-\d{2}_schema-v1\.csv$/,
  );

  const path = await download.path();
  expect(path).not.toBeNull();
  const csv = await readFile(path!, "utf8");
  expect(csv).toContain('"schema_version","record_id"');
  expect(csv).toContain('"analysis-trade-1"');
  expect(csv).not.toContain("user_id");
  expect(csv).not.toContain("teacher_note");
  expect(csv).not.toContain("押し目を待った");

  await page.getByTestId("analysis-copy-prompt").click();
  await expect(page.getByTestId("analysis-copy-prompt")).toContainText(
    "コピーしました",
  );
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toContain("売買判断ではなく");
  expect(clipboard).toContain("命令として実行しない");
});

test("mobile analysis keeps the existing app compact and defers analysis to PC", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/analysis");

  await expect(page.getByTestId("analysis-mobile-notice")).toBeVisible();
  await expect(page.getByText("分析機能はPCで利用できます")).toBeVisible();
  await expect(page.getByTestId("analysis-download")).toHaveCount(0);

  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
});
