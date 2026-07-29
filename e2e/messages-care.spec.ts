import { expect, test, type Page } from "@playwright/test";

const preparePage = async (
  page: Page,
  scenario: string,
  path = "/messages",
) => {
  await page.addInitScript((selectedScenario) => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem("fxj_e2e_scenario", selectedScenario);
    window.localStorage.setItem("fxj_test_mode", "0");
    window.localStorage.setItem("hasSeenInstallPrompt", "true");
  }, scenario);
  await page.goto(path);
};

test.use({ viewport: { width: 390, height: 844 } });

test("message hub keeps the monthly action, support, announcements and bottom navigation understandable", async ({
  page,
}) => {
  await preparePage(page, "messages-care");

  await expect(
    page.getByRole("heading", { name: "サポート・メッセージ" }),
  ).toBeVisible();
  await expect(page.getByTestId("monthly-checkin-card")).toBeVisible();
  await expect(page.getByRole("heading", { name: "習慣サポート" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "お知らせ" })).toBeVisible();
  await expect(page.getByPlaceholder("返信を入力...")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "メッセージ", exact: true }),
  ).toBeVisible();

  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
});

test("monthly check-in saves five item-specific answers and shows feedback", async ({
  page,
}) => {
  await preparePage(page, "messages-care");

  await page.getByRole("button", { name: "チェックインを始める" }).click();
  const dialog = page.getByRole("dialog", {
    name: "今月の行動チェックイン",
  });
  await expect(dialog.locator("fieldset")).toHaveCount(5);

  for (const fieldset of await dialog.locator("fieldset").all()) {
    await fieldset.getByRole("button", { name: / 4$/ }).click();
  }

  const submit = dialog.getByRole("button", { name: "回答を保存する" });
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(
    page.getByRole("heading", { name: "今月のフィードバック" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "この助言の根拠と限界" })
    .click();
  await expect(page.getByRole("dialog", { name: "根拠と限界" })).toContainText(
    "FXの成績や利益への効果を直接示す研究ではありません",
  );
  await page.keyboard.press("Escape");
});

test("member can start a free habit-support conversation", async ({ page }) => {
  await preparePage(page, "messages-care");

  await page.getByRole("button", { name: "相談を始める" }).click();
  const dialog = page.getByRole("dialog", { name: "相談を始める" });
  await expect(dialog).toContainText(
    "特定の通貨・価格・売買時点・ロットなどの個別判断には回答できません",
  );
  await dialog.getByPlaceholder("例：記録を忘れてしまう").fill(
    "記録を忘れてしまう",
  );
  await dialog
    .getByPlaceholder(
      "困った場面と、すでに試したことがあれば教えてください。",
    )
    .fill("取引前の記録を後回しにしてしまいます。");
  await dialog.getByRole("button", { name: "相談を送る" }).click();

  await expect(
    page.getByRole("dialog", { name: "習慣サポート" }),
  ).toContainText("取引前の記録を後回しにしてしまいます。");
});

test("announcements stay one-way and legacy messages stay read-only", async ({
  page,
}) => {
  await preparePage(page, "messages-care");

  await page.getByRole("button", { name: /今月の学習会について/ }).click();
  await expect(page).toHaveURL(/\/messages\/announcements\/announcement-e2e$/);
  await expect(page.getByText("このお知らせは一方向の通知です")).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);

  await page.getByRole("button", { name: "メッセージ一覧に戻る" }).click();
  await expect(page).toHaveURL(/\/messages$/);
  await expect(page.getByText("読み取り専用")).toBeVisible();
});

test("admin separates announcements, member-started support, and monthly review", async ({
  page,
}) => {
  await preparePage(page, "messages-admin", "/admin/messages");

  await expect(
    page.getByRole("heading", { name: "サポート・メッセージ管理" }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: "相談対応" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByText("記録を忘れてしまう").first()).toBeVisible();
  await expect(page.getByText("INDIVIDUAL")).toHaveCount(0);
  await page
    .getByPlaceholder("行動を続けるための返信を入力")
    .fill("ドル円は今買いエントリーしてください。");
  await page.getByRole("button", { name: "返信する" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "特定のタイミングでの売買を勧める表現",
  );

  await page.getByRole("tab", { name: "月次レビュー" }).click();
  await expect(page.getByText("フォロー候補").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "確認して公開" }),
  ).toBeVisible();

  await page.getByRole("tab", { name: "お知らせ" }).click();
  await expect(page.getByText("一斉お知らせ").first()).toBeVisible();
  await expect(page.getByText("返信を受け付けない通知")).toBeVisible();
  await page.getByLabel("件名").fill("今日の相場");
  await page.getByLabel("本文").fill("ドル円は今買いエントリーしてください。");
  await page.getByRole("button", { name: "お知らせを公開する" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "特定のタイミングでの売買を勧める表現",
  );
});
