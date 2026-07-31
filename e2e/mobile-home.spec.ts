import { expect, test, type Page } from "@playwright/test";

type HapticPattern = number | number[];
type UpdateRecord = {
  table: string;
  rows: Array<Record<string, unknown>>;
  filters: Record<string, unknown>;
};

const persistedTradeState = (state: Record<string, unknown>) =>
  JSON.stringify({
    state: {
      mode: "live",
      gate: {
        gate_trade_count_ok: true,
        gate_rr_ok: true,
        gate_risk_ok: true,
        gate_rule_ok: true,
      },
      note: "E2E careful setup",
      successProb: "mid",
      expectedValue: "plus",
      accountBalance: "100000",
      stopLossAmount: "1000",
      takeProfitAmount: "3000",
      selectedPairSymbol: "",
      stopLossPips: "",
      takeProfitPips: "",
      riskPercent: "2",
      gateHelp: { rr: true, risk: true, rule: true },
      ...state,
    },
    version: 0,
  });

const loadHome = async (
  page: Page,
  options: {
    scenario?: string;
    reducedMotion?: boolean;
    withVibration?: boolean;
    tradeState?: Record<string, unknown>;
  } = {},
) => {
  if (options.reducedMotion) {
    await page.emulateMedia({ reducedMotion: "reduce" });
  }

  await page.addInitScript(
    ({ scenario, withVibration, tradeState }) => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem("fxj_e2e_scenario", scenario);
      window.localStorage.setItem("fxj_test_mode", "0");
      window.localStorage.setItem("hasSeenInstallPrompt", "true");
      if (tradeState) {
        window.localStorage.setItem("fx-trade-storage", tradeState);
      }

      if (withVibration) {
        (
          window as typeof window & { __FXJ_HAPTICS__?: HapticPattern[] }
        ).__FXJ_HAPTICS__ = [];
        Object.defineProperty(navigator, "vibrate", {
          configurable: true,
          value: (pattern: HapticPattern) => {
            (
              window as typeof window & { __FXJ_HAPTICS__: HapticPattern[] }
            ).__FXJ_HAPTICS__.push(pattern);
            return true;
          },
        });
      } else {
        Object.defineProperty(navigator, "vibrate", {
          configurable: true,
          value: undefined,
        });
      }
    },
    {
      scenario: options.scenario ?? "default",
      withVibration: options.withVibration ?? true,
      tradeState: options.tradeState
        ? persistedTradeState(options.tradeState)
        : null,
    },
  );

  await page.goto("/");
};

const hapticCalls = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as typeof window & { __FXJ_HAPTICS__?: HapticPattern[] }
      ).__FXJ_HAPTICS__ ?? [],
  );

const tradeLogUpdates = (page: Page) =>
  page.evaluate(() => {
    const state = (window as typeof window & {
      __FXJ_E2E_STATE__?: { updates: UpdateRecord[] };
    }).__FXJ_E2E_STATE__;

    return (state?.updates ?? []).filter((record) => record.table === "trade_logs");
  });

const reachFinalPreTradeStep = async (page: Page) => {
  await page.getByLabel("通貨ペア").selectOption("USD/JPY");
  await page.getByLabel("口座残高").fill("100000");
  await page.getByTestId("pre-trade-next").click();
  await page.getByTestId("pre-trade-entry-rate").fill("150");
  await page.getByTestId("pre-trade-stop-loss-rate").fill("149.8");
  await page.getByTestId("pre-trade-next").click();
};

test.use({ viewport: { width: 390, height: 844 } });

test("mobile home keeps progress, primary action, and bottom navigation immediately understandable", async ({
  page,
}) => {
  await loadHome(page, { scenario: "progress" });

  const progressCard = page.getByTestId("progress-card");
  const primaryAction = page.getByTestId("next-action-primary");
  const navigator = page.getByTestId("home-navigator");
  const bottomNavigation = page.locator("div.fixed.bottom-0");

  await expect(page.getByText("FX Journal MVP")).toBeVisible();
  await expect(progressCard).toContainText("7");
  await expect(progressCard).toContainText("Lv.3");
  await expect(progressCard).toContainText("42/100 XP");
  await expect(primaryAction).toBeVisible();
  await expect(navigator).toBeVisible();
  await expect(bottomNavigation).toBeVisible();

  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    viewportHeight: window.innerHeight,
    documentHeight: document.documentElement.scrollHeight,
  }));

  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.documentHeight - layout.viewportHeight).toBeLessThanOrEqual(80);
});

test("progress card supports tap, Enter, and Space navigation", async ({ page }) => {
  await loadHome(page);

  await page.getByTestId("progress-card").click();
  await expect(page).toHaveURL(/\/mypage$/);
  await expect.poll(() => hapticCalls(page)).toContain(10);

  await page.goto("/");
  const progressCard = page.getByTestId("progress-card");
  await progressCard.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/mypage$/);

  await page.goto("/");
  await page.getByTestId("progress-card").focus();
  await page.keyboard.press("Space");
  await expect(page).toHaveURL(/\/mypage$/);
});

test("home keeps the normal pre-trade and skip routes", async ({ page }) => {
  await loadHome(page);

  await page.getByTestId("next-action-primary").click();
  await expect(page).toHaveURL(/\/pre-trade$/);

  await page.goto("/");
  await page.getByTestId("next-action-secondary").click();
  await expect(page).toHaveURL(/\/skip$/);
});

test("pending trade takes priority on the home action", async ({ page }) => {
  await loadHome(page, { scenario: "pending-trade" });
  await expect(page.getByTestId("home-navigator-message")).toContainText(
    "結果より事実を短く",
  );
  await expect(page.getByTestId("next-action-primary")).toContainText(
    "取引が終わったので記録する",
  );
  await page.getByTestId("next-action-primary").click();
  await expect(page).toHaveURL(/\/post-trade$/);
});

test("pending trade can be converted to a skip without creating a duplicate record", async ({
  page,
}) => {
  await loadHome(page, { scenario: "pending-trade" });

  await page.getByTestId("next-action-secondary").click();

  await expect
    .poll(() => tradeLogUpdates(page))
    .toHaveLength(1);
  const updates = await tradeLogUpdates(page);
  expect(updates[0]).toMatchObject({
    table: "trade_logs",
    rows: [{ log_type: "skip" }],
    filters: { id: "pending-e2e-log", user_id: "e2e-user" },
  });
  await expect(page.getByRole("status")).toContainText(
    "取引しなかった判断を見送りとして記録しました",
  );
});

test("daily limit takes priority on the home action", async ({ page }) => {
  await loadHome(page, { scenario: "daily-limit" });
  await expect(page.getByTestId("home-navigator-message")).toContainText(
    "今日は上限に達しています",
  );
  await page.getByTestId("next-action-primary").click();
  await expect(page).toHaveURL(/\/skip$/);
});

test("completed day receives a calm completion message", async ({ page }) => {
  await loadHome(page, { scenario: "completed-trade" });

  await expect(page.getByTestId("home-navigator-message")).toContainText(
    "慎重な判断、おつかれさまでした",
  );
  await expect(page.getByTestId("next-action-primary")).toBeDisabled();
});

test("navigator opens the recording guide and closes it with Escape", async ({
  page,
}) => {
  await loadHome(page);
  const mascot = page.getByTestId("home-navigator-mascot");

  await mascot.click();
  await mascot.click();
  await page.getByTestId("home-navigator-guide-action").click();

  const dialog = page.getByTestId("home-guide-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("取引前（30秒）");
  await expect(dialog).toContainText("見送り（15秒）");
  await expect(dialog).toContainText("取引後（60秒）");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("navigator learning message opens the learning contents", async ({
  page,
}) => {
  await loadHome(page);
  const mascot = page.getByTestId("home-navigator-mascot");

  await mascot.click();
  await mascot.click();
  await mascot.click();
  await mascot.click();
  await page.getByTestId("home-navigator-learning-action").click();

  await expect(page).toHaveURL(/\/learning-contents$/);
});

test("skip success uses the shared success haptic", async ({ page }) => {
  await loadHome(page);
  await page.goto("/skip");
  await page.getByTestId("skip-save").click();

  await expect.poll(() => hapticCalls(page)).toContainEqual([20, 50, 20]);
  await expect(page.getByAltText(/Mascot/)).toBeVisible();
  await expect(page.getByTestId("home-navigator")).toBeVisible();
});

test("insert failure does not vibrate or celebrate", async ({ page }) => {
  await loadHome(page, { scenario: "insert-error" });
  await page.goto("/skip");
  await page.getByTestId("skip-save").click();

  await expect
    .poll(() => hapticCalls(page))
    .not.toContainEqual([20, 50, 20]);
  await expect(page.getByAltText(/Mascot/)).toHaveCount(0);
  await expect(page).toHaveURL(/\/skip$/);
  await expect(page.getByTestId("skip-save")).toBeEnabled();
  await expect(page.getByRole("status")).toContainText("見送りの保存に失敗");
});

test("pre-trade success uses the shared success haptic", async ({ page }) => {
  await loadHome(page, { tradeState: {} });
  await page.goto("/pre-trade");
  await reachFinalPreTradeStep(page);
  await page.getByTestId("pre-trade-save").click();

  await expect.poll(() => hapticCalls(page)).toContainEqual([20, 50, 20]);
  await expect(page.getByAltText(/Mascot/)).toBeVisible();

  await page.goBack();
  await expect(page.getByLabel("通貨ペア")).toHaveValue("USD/JPY");
  await expect(page.getByLabel("口座残高")).toHaveValue("100,000");
});

test("pre-trade uses a focused staged flow without remaining-count objects", async ({
  page,
}) => {
  await loadHome(page, { tradeState: {} });
  await page.goto("/pre-trade");

  await expect(page.getByTestId("pre-trade-flow")).toContainText("1 / 3");
  await expect(page.getByText("本日残り")).toHaveCount(0);
  await expect(page.locator("div.fixed.bottom-0")).toHaveCount(0);

  await page.getByLabel("通貨ペア").selectOption("USD/JPY");
  await page.getByLabel("口座残高").fill("250000");
  await page.getByTestId("pre-trade-next").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("pre-trade-flow")).toContainText("2 / 3");

  await page.getByTestId("pre-trade-entry-rate").fill("150");
  await page.getByTestId("pre-trade-stop-loss-rate").fill("149.8");
  await page.getByTestId("pre-trade-next").focus();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("pre-trade-flow")).toContainText("3 / 3");
  await expect(page.getByTestId("pre-trade-save")).toBeVisible();
});

test("live and practice accounts remember their own reusable inputs", async ({
  page,
}) => {
  await loadHome(page, { tradeState: {} });
  await page.goto("/pre-trade");

  await page.getByLabel("通貨ペア").selectOption("USD/JPY");
  await page.getByLabel("口座残高").fill("500000");

  await page.getByRole("button", { name: /練習/ }).click();
  await expect(page.getByLabel("口座残高")).toHaveValue("");
  await page.getByLabel("通貨ペア").selectOption("USD/JPY");
  await page.getByLabel("口座残高").fill("100000");

  await page.getByRole("button", { name: /本番/ }).click();
  await expect(page.getByLabel("通貨ペア")).toHaveValue("USD/JPY");
  await expect(page.getByLabel("口座残高")).toHaveValue("500,000");

  await page.getByRole("button", { name: /練習/ }).click();
  await expect(page.getByLabel("口座残高")).toHaveValue("100,000");
});

for (const width of [320, 375, 390, 430]) {
  test(`pre-trade entry remains usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await loadHome(page, { tradeState: {} });
    await page.goto("/pre-trade");

    const layout = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
    await expect(page.getByTestId("pre-trade-next")).toBeVisible();
    await expect(page.locator("div.fixed.bottom-0")).toHaveCount(0);
  });
}

test("post-trade success uses the shared success haptic", async ({ page }) => {
  await loadHome(page, {
    scenario: "pending-trade",
    tradeState: {
      postSide: "long",
      postResult: "win",
      postRuleRespected: true,
      postInExpectedRange: true,
      postGoodParticipation: true,
    },
  });
  await page.goto("/post-trade");
  await expect(page.getByTestId("post-trade-flow")).toContainText("1 / 2");
  await page.getByTestId("post-trade-next").click();
  await expect(page.getByTestId("post-trade-flow")).toContainText("2 / 2");
  await page.getByTestId("post-trade-save").click();

  await expect.poll(() => hapticCalls(page)).toContainEqual([20, 50, 20]);
  await expect(page.getByAltText(/Mascot/)).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test("post-trade update failure preserves the entered draft and allows retry", async ({
  page,
}) => {
  await loadHome(page, {
    scenario: "pending-trade",
    tradeState: {
      postSide: "long",
      postResult: "loss",
      postRuleRespected: true,
      postInExpectedRange: false,
      postGoodParticipation: true,
    },
  });
  await page.goto("/post-trade");
  await page.getByTestId("post-trade-next").click();
  await page.evaluate(() => {
    window.localStorage.setItem("fxj_e2e_scenario", "update-error");
  });
  await page.getByTestId("post-trade-save").click();

  await expect(page).toHaveURL(/\/post-trade$/);
  await expect(page.getByTestId("post-trade-save")).toBeEnabled();
  await expect(page.getByTestId("post-trade-flow")).toContainText("2 / 2");
  await expect(page.getByRole("status")).toContainText("取引後記録の保存に失敗");
  await expect
    .poll(() => hapticCalls(page))
    .not.toContainEqual([20, 50, 20]);
});

for (const width of [320, 390]) {
  test(`post-trade and skip flows remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await loadHome(page, { scenario: "pending-trade" });
    await page.goto("/post-trade");

    await expect(page.getByTestId("post-trade-next")).toBeVisible();
    await expect(page.locator("div.fixed.bottom-0")).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);

    await page.goto("/skip");
    await expect(page.getByTestId("skip-save")).toBeVisible();
    await expect(page.locator("div.fixed.bottom-0")).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  });
}

test("reduced motion and missing vibration keep the card functional", async ({
  page,
}) => {
  await loadHome(page, {
    scenario: "progress",
    reducedMotion: true,
    withVibration: false,
  });

  const fill = page.getByTestId("xp-progress-fill");
  await expect
    .poll(() =>
      fill.evaluate((element) => {
        const parentWidth = element.parentElement?.getBoundingClientRect().width ?? 1;
        return element.getBoundingClientRect().width / parentWidth;
      }),
    )
    .toBeCloseTo(0.42, 2);

  await page.getByTestId("home-navigator-mascot").click();
  await expect(page.getByTestId("home-navigator-message")).toContainText(
    "見送りも立派な記録",
  );

  await page.getByTestId("progress-card").focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/mypage$/);
});
