import { expect, test, type Page } from "@playwright/test";

type InsertRecord = {
  table: string;
  rows: Array<Record<string, unknown>>;
};

const persistedTradeState = (state: Record<string, unknown>) =>
  JSON.stringify({
    state: {
      mode: "live",
      gate: {
        gate_trade_count_ok: true,
        gate_rr_ok: true,
        gate_risk_ok: true,
        gate_rule_ok: false,
      },
      note: "E2E governed setup",
      successProb: "mid",
      expectedValue: "plus",
      accountBalance: "100000",
      stopLossAmount: "1000",
      takeProfitAmount: "3000",
      selectedPairSymbol: "",
      stopLossPips: "",
      takeProfitPips: "",
      riskPercent: "2",
      ...state,
    },
    version: 0,
  });

const loadScenario = async (
  page: Page,
  path: string,
  options: { scenario?: string; tradeState?: Record<string, unknown> } = {},
) => {
  await page.addInitScript(({ scenario, tradeState }) => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem("fxj_e2e_scenario", scenario);
    window.localStorage.setItem("fxj_test_mode", "0");
    window.localStorage.setItem("hasSeenInstallPrompt", "true");
    if (tradeState) {
      window.localStorage.setItem("fx-trade-storage", tradeState);
    }
  }, {
    scenario: options.scenario ?? "default",
    tradeState: options.tradeState ?? null,
  });

  await page.goto(path);
};

const tradeLogInserts = async (page: Page) =>
  page.evaluate(() => {
    const state = (window as typeof window & {
      __FXJ_E2E_STATE__?: { inserts: InsertRecord[] };
    }).__FXJ_E2E_STATE__;

    return (state?.inserts ?? []).filter((record) => record.table === "trade_logs");
  });

const forceClickDisabledButton = async (page: Page, testId: string) => {
  await page.getByTestId(testId).evaluate((button) => {
    button.removeAttribute("disabled");
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
};

test("Gate block prevents trade save when Rule OK is not confirmed", async ({ page }) => {
  await loadScenario(page, "/pre-trade", {
    tradeState: persistedTradeState({
      gateHelp: { rr: false, risk: false, rule: false },
    }),
  });

  const saveButton = page.getByTestId("pre-trade-save");
  await expect(saveButton).toBeVisible();
  await expect(saveButton).toBeDisabled();

  await forceClickDisabledButton(page, "pre-trade-save");

  await expect.poll(() => tradeLogInserts(page)).toHaveLength(0);
});

test("daily loss limit lock prevents trade save when the daily limit is reached", async ({ page }) => {
  await loadScenario(page, "/pre-trade", {
    scenario: "daily-limit",
    tradeState: persistedTradeState({
      gateHelp: { rr: true, risk: true, rule: true },
    }),
  });

  const saveButton = page.getByTestId("pre-trade-save");
  await expect(saveButton).toBeVisible();
  await expect(saveButton).toBeDisabled();

  await forceClickDisabledButton(page, "pre-trade-save");

  await expect.poll(() => tradeLogInserts(page)).toHaveLength(0);
});

test("skip record can be saved successfully", async ({ page }) => {
  await loadScenario(page, "/skip");

  await page.getByTestId("skip-save").click();

  await expect.poll(() => tradeLogInserts(page)).toHaveLength(1);
  const inserts = await tradeLogInserts(page);
  expect(inserts[0].rows[0]).toMatchObject({
    log_type: "skip",
    gate_rule_ok: false,
  });
});

test("overtrading risk queue is visible when a risk signal exists", async ({ page }) => {
  await loadScenario(page, "/staff", { scenario: "risk-queue" });

  await page.getByTestId("risk-queue-toggle").click();

  await expect(page.getByTestId("risk-queue")).toBeVisible();
  await expect(page.getByTestId("risk-queue-row")).toContainText("Risk Queue User");
});
