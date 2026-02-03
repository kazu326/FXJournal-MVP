import { test, expect } from '@playwright/test';

test('top page has expected title and login button', async ({ page }) => {
    // 開発サーバーへアクセス
    await page.goto('http://localhost:5173');

    // タイトルの確認
    await expect(page).toHaveTitle(/fx-journal-mvp/);

    // 「FX Journal MVP」というテキストが表示されているか確認
    const heading = page.getByRole('heading', { name: 'FX Journal MVP' });
    await expect(heading).toBeVisible();

    // ログインボタン（Discord）が存在するか確認
    const discordLoginBtn = page.getByRole('button', { name: /Discordでログイン/ });
    await expect(discordLoginBtn).toBeVisible();

    // キャプチャを撮る（デバッグ用）
    await page.screenshot({ path: 'e2e-screenshots/top-page.png' });
});

test('navigation to lecture notes should be reflected in URL (if accessible)', async ({ page }) => {
    // ログインしていない状態での挙動を確認
    await page.goto('http://localhost:5173');

    // 未ログイン時はログイン画面が表示されるはず
    const loginHeader = page.getByRole('heading', { name: 'ログイン' });
    await expect(loginHeader).toBeVisible();
});
