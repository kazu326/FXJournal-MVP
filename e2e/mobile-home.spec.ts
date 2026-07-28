import { expect, test, type Page } from "@playwright/test";

type HapticPattern = number | number[];

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
  await page.getByTestId("next-action-primary").click();
  await expect(page).toHaveURL(/\/post-trade$/);
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
});

test("pre-trade success uses the shared success haptic", async ({ page }) => {
  await loadHome(page, { tradeState: {} });
  await page.goto("/pre-trade");
  await page.getByTestId("pre-trade-save").click();

  await expect.poll(() => hapticCalls(page)).toContainEqual([20, 50, 20]);
  await expect(page.getByAltText(/Mascot/)).toBeVisible();
});

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
  await page.getByTestId("post-trade-save").click();

  await expect.poll(() => hapticCalls(page)).toContainEqual([20, 50, 20]);
  await expect(page.getByAltText(/Mascot/)).toBeVisible();
});

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
