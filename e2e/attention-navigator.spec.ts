import { expect, test, type Page } from "@playwright/test";

type MutationRecord = {
  table: string;
  rows: Array<Record<string, unknown>>;
};

const loadAttention = async (page: Page, scenario = "default") => {
  await page.addInitScript((selectedScenario) => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem("fxj_e2e_scenario", selectedScenario);
    window.localStorage.setItem("fxj_test_mode", "0");
    window.localStorage.setItem("hasSeenInstallPrompt", "true");
  }, scenario);
  await page.goto("/");
  await page.getByTestId("attention-start-home").click();
  await page.getByLabel("Attention 通貨ペア").selectOption("pair-xau-usd");
  await page.getByTestId("attention-setup-start").click();
};

const mutations = async (page: Page, kind: "inserts" | "updates") =>
  page.evaluate((mutationKind) => {
    const state = (window as typeof window & {
      __FXJ_E2E_STATE__?: {
        inserts: MutationRecord[];
        updates: MutationRecord[];
      };
    }).__FXJ_E2E_STATE__;
    return state?.[mutationKind] ?? [];
  }, kind);

const answerYes = async (page: Page, count: number) => {
  for (let index = 0; index < count; index += 1) {
    await page.getByTestId("attention-answer-yes").click();
  }
};

const reachExistingTradeSave = async (page: Page) => {
  await answerYes(page, 4);
  await expect(page.getByText("ブレイク後の価格位置は許容範囲ですか？")).toBeVisible();
  await answerYes(page, 7);
  await page.getByTestId("attention-decision-trade").click();

  await expect(page.getByTestId("pre-trade-flow")).toBeVisible();
  await expect(page.getByLabel("通貨ペア")).toHaveValue("XAU/USD");
  await page.getByLabel("口座残高").fill("100000");
  await page.getByTestId("pre-trade-next").click();
  await page.getByTestId("pre-trade-entry-rate").fill("4500");
  await page.getByTestId("pre-trade-stop-loss-rate").fill("4499.9");
  await page.getByTestId("pre-trade-next").click();
  await page.getByPlaceholder("なぜここでエントリーするのか？根拠を記入してください...").fill("Attention PASS後の根拠");
  await page.getByText("Rule OK", { exact: true }).click();
  await page.getByTestId("pre-trade-save").click();
};

test("STOP stores only an Attention session using the existing XAU/USD identifier", async ({ page }) => {
  await loadAttention(page);
  await page.getByTestId("attention-answer-no").click();

  await expect(page.getByTestId("attention-result")).toContainText("STOP");
  await expect.poll(async () => mutations(page, "inserts")).toHaveLength(1);

  const inserts = await mutations(page, "inserts");
  expect(inserts[0]).toMatchObject({
    table: "attention_sessions",
    rows: [
      expect.objectContaining({
        currency_pair_id: "pair-xau-usd",
        symbol: "XAU/USD",
        gate_result: "stop",
      }),
    ],
  });
});

test("Hard veto prevents the trade decision", async ({ page }) => {
  await loadAttention(page);
  await answerYes(page, 4);
  await expect(page.getByText("ブレイク後の価格位置は許容範囲ですか？")).toBeVisible();
  await answerYes(page, 5);
  await page.getByTestId("attention-answer-no").click();

  await expect(page.getByText("Hard veto STOP")).toBeVisible();
  await expect(page.getByTestId("attention-decision-trade")).toBeDisabled();
});

test("trade consideration enters the existing 4-Gate and links the trade log", async ({ page }) => {
  await loadAttention(page);
  await reachExistingTradeSave(page);

  await expect.poll(async () => {
    const inserts = await mutations(page, "inserts");
    return inserts.filter((record) => record.table === "trade_logs").length;
  }).toBe(1);

  await expect.poll(async () => {
    const updates = await mutations(page, "updates");
    return updates.filter((record) => record.table === "attention_sessions").length;
  }).toBe(2);

  const updates = await mutations(page, "updates");
  expect(updates.at(-1)).toMatchObject({
    table: "attention_sessions",
    rows: [expect.objectContaining({ trade_log_id: expect.any(String) })],
  });
});

test("link failure keeps the trade log and shows an explicit warning without a retry queue", async ({ page }) => {
  await loadAttention(page, "attention-link-error");
  await reachExistingTradeSave(page);

  await expect(page.getByTestId("status-message")).toContainText(
    "取引前の記録は保存しましたが、Attentionログの関連付けに失敗しました",
  );
  const inserts = await mutations(page, "inserts");
  expect(inserts.filter((record) => record.table === "trade_logs")).toHaveLength(1);
});
