import { expect, test } from "@playwright/test";

test("logged-out mobile users see Discord as the new-member path", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?e2e-scenario=logged-out");

  await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Discordでログイン（推奨）" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "登録済みメールをお持ちの方のみ。新規利用はDiscordからログインしてください。",
    ),
  ).toBeVisible();

  const layout = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.contentWidth).toBeLessThanOrEqual(layout.viewportWidth);

  await page.getByPlaceholder("メールアドレス").fill("existing@example.com");
  await page.getByRole("button", { name: "メールアドレスでログイン" }).click();
  await expect(
    page.getByText("マジックリンクを送信しました。メールのリンクを踏んでください。"),
  ).toBeVisible();
});
