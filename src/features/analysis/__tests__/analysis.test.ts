import {
  buildAnalysisFilename,
  serializeAnalysisCsv,
} from "../csv";
import { buildAnalysisBehaviorDetails } from "../insights";
import { summarizeAnalysisRecords } from "../metrics";
import {
  collectAllPages,
  getAnalysisPeriodStart,
} from "../pagination";
import { buildAnalysisPrompt } from "../prompt";
import { normalizeAnalysisRecord } from "../types";

describe("analysis CSV MVP", () => {
  const source = {
    id: "record-1",
    occurred_at: "2026-07-15T01:02:03.000Z",
    log_type: "valid",
    mode: "live",
    completed_at: "2026-07-15T02:00:00.000Z",
    ruleset_version: "v1",
    currency_pair_symbol: "USDJPY",
    gate_trade_count_ok: true,
    gate_rr_ok: true,
    gate_risk_ok: true,
    gate_rule_ok: true,
    success_prob: "mid",
    expected_value: "plus",
    post_rule_respected: true,
    post_in_expected_range: false,
    pre_note: "=SUM(1,2)",
    post_reference_point: "事実を確認",
    post_note: "次回も記録する",
  };

  test("normalizes records and summarizes behavior without using profit as the headline", () => {
    const trade = normalizeAnalysisRecord(source);
    const skip = normalizeAnalysisRecord({
      id: "record-2",
      occurred_at: "2026-07-16T01:02:03.000Z",
      log_type: "skip",
    });

    expect(trade.currencyPair).toBe("USDJPY");
    expect(trade.postRuleRespected).toBe(true);
    expect(trade.postWithinHypothesis).toBe(false);

    expect(summarizeAnalysisRecords([trade, skip])).toEqual({
      totalRecords: 2,
      tradeRecords: 1,
      skipRecords: 1,
      completedRecords: 1,
      completionRate: 100,
      ruleEvidenceCount: 1,
      ruleAdherenceRate: 100,
    });
  });

  test("builds behavior insights from record coverage without treating skips as missing post records", () => {
    const records = [
      normalizeAnalysisRecord(source),
      normalizeAnalysisRecord({
        id: "record-2",
        occurred_at: "2026-07-16T01:02:03.000Z",
        log_type: "invalid",
        mode: "practice",
      }),
      normalizeAnalysisRecord({
        id: "record-3",
        occurred_at: "2026-07-17T01:02:03.000Z",
        log_type: "skip",
      }),
    ];

    const details = buildAnalysisBehaviorDetails(records);

    expect(details.mix).toEqual({
      valid: 1,
      invalid: 1,
      skip: 1,
      unknown: 0,
      live: 1,
      practice: 1,
    });
    expect(details.activeDays).toBe(3);
    expect(details.coverage).toEqual([
      {
        key: "preCheck",
        label: "事前チェック",
        count: 1,
        total: 2,
        rate: 50,
      },
      {
        key: "postRecord",
        label: "取引後記録",
        count: 1,
        total: 2,
        rate: 50,
      },
      {
        key: "ruleReview",
        label: "ルール振り返り",
        count: 1,
        total: 2,
        rate: 50,
      },
      {
        key: "hypothesisReview",
        label: "想定内の確認",
        count: 1,
        total: 2,
        rate: 50,
      },
    ]);
    expect(details.insights.map((insight) => insight.id)).toEqual([
      "skip-recorded",
      "post-record-missing",
      "rule-review-missing",
      "invalid-recorded",
    ]);
  });

  test("keeps a fixed schema, excludes notes by default, and blocks spreadsheet formulas", () => {
    const record = normalizeAnalysisRecord(source);
    const withoutNotes = serializeAnalysisCsv([record], false);
    const withNotes = serializeAnalysisCsv([record], true);

    expect(withoutNotes.startsWith("\uFEFF")).toBe(true);
    expect(withoutNotes).toContain('"schema_version","record_id"');
    expect(withoutNotes).not.toContain("SUM(1,2)");
    expect(withoutNotes).not.toContain("user_id");
    expect(withoutNotes).not.toContain("teacher_note");
    expect(withNotes).toContain(`"'=SUM(1,2)"`);
  });

  test("collects more than one Supabase page without dropping the boundary row", async () => {
    const rows = Array.from({ length: 2005 }, (_, index) => index);
    const calls: Array<[number, number]> = [];

    const result = await collectAllPages(
      async (from, to) => {
        calls.push([from, to]);
        return {
          data: rows.slice(from, to + 1),
          error: null,
        };
      },
      1000,
    );

    expect(result).toHaveLength(2005);
    expect(result[1000]).toBe(1000);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  test("builds stable period boundaries, filenames, and a non-advisory prompt", () => {
    const now = new Date("2026-07-30T12:00:00.000Z");

    expect(getAnalysisPeriodStart("30d", now)).toBe(
      "2026-06-30T12:00:00.000Z",
    );
    expect(getAnalysisPeriodStart("all", now)).toBeNull();
    expect(buildAnalysisFilename("90d", now)).toBe(
      "fxjournal_analysis_90d_2026-07-30_schema-v1.csv",
    );

    const prompt = buildAnalysisPrompt("30d");
    expect(prompt).toContain("売買判断ではなく");
    expect(prompt).toContain("命令として実行しない");
    expect(prompt).toContain("データ不足");
  });
});
