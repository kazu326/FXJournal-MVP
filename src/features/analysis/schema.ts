import type { AnalysisRecord } from "./types";

export const ANALYSIS_SELECT_COLUMNS = [
  "id",
  "occurred_at",
  "trade_datetime",
  "log_type",
  "mode",
  "completed_at",
  "ruleset_version",
  "currency_pair_symbol",
  "account_balance",
  "stop_loss_pips",
  "take_profit_pips",
  "stop_loss_amount",
  "take_profit_amount",
  "calculated_lot",
  "risk_percent",
  "risk_reward_ratio",
  "gate_trade_count_ok",
  "gate_rr_ok",
  "gate_risk_ok",
  "gate_rule_ok",
  "success_prob",
  "expected_value",
  "pre_env_sign",
  "pre_env_trend4h_up",
  "pre_env_range4h",
  "pre_env_support15m",
  "pre_env_long_wick15m",
  "pre_env_flag",
  "pre_env_triangle",
  "pre_env_london",
  "pre_env_newyork",
  "pre_env_as_planned",
  "post_side",
  "post_result",
  "result",
  "post_pl",
  "post_rr_text",
  "post_rule_respected",
  "post_gate_kept",
  "post_in_expected_range",
  "post_within_hypothesis",
  "post_good_participation",
  "unexpected_reason",
  "pre_note",
  "note",
  "post_reference_point",
  "post_note",
  "voided_at",
].join(",");

type CsvValue = string | number | boolean | null;

export type AnalysisColumn = {
  key: string;
  label: string;
  value: (record: AnalysisRecord, includeNotes: boolean) => CsvValue;
};

export const ANALYSIS_COLUMNS: readonly AnalysisColumn[] = [
  {
    key: "schema_version",
    label: "CSV仕様",
    value: () => "1.0",
  },
  {
    key: "record_id",
    label: "記録ID",
    value: (record) => record.id,
  },
  {
    key: "occurred_at",
    label: "記録日時",
    value: (record) => record.occurredAt,
  },
  {
    key: "record_type",
    label: "記録種別",
    value: (record) => record.recordType,
  },
  {
    key: "mode",
    label: "取引モード",
    value: (record) => record.mode,
  },
  {
    key: "completed_at",
    label: "取引後記録日時",
    value: (record) => record.completedAt,
  },
  {
    key: "ruleset_version",
    label: "ルールセット",
    value: (record) => record.rulesetVersion,
  },
  {
    key: "currency_pair",
    label: "通貨ペア",
    value: (record) => record.currencyPair,
  },
  {
    key: "planned_account_balance",
    label: "計画時口座残高",
    value: (record) => record.accountBalance,
  },
  {
    key: "planned_stop_loss_pips",
    label: "計画損切りpips",
    value: (record) => record.stopLossPips,
  },
  {
    key: "planned_take_profit_pips",
    label: "計画利確pips",
    value: (record) => record.takeProfitPips,
  },
  {
    key: "planned_stop_loss_amount",
    label: "計画損失額",
    value: (record) => record.stopLossAmount,
  },
  {
    key: "planned_take_profit_amount",
    label: "計画利益額",
    value: (record) => record.takeProfitAmount,
  },
  {
    key: "planned_lot",
    label: "計画ロット",
    value: (record) => record.calculatedLot,
  },
  {
    key: "planned_risk_percent",
    label: "計画リスク率",
    value: (record) => record.riskPercent,
  },
  {
    key: "planned_risk_reward_ratio",
    label: "計画RR",
    value: (record) => record.riskRewardRatio,
  },
  {
    key: "gate_trade_count_ok",
    label: "取引回数Gate",
    value: (record) => record.gateTradeCountOk,
  },
  {
    key: "gate_rr_ok",
    label: "RRGate",
    value: (record) => record.gateRrOk,
  },
  {
    key: "gate_risk_ok",
    label: "リスクGate",
    value: (record) => record.gateRiskOk,
  },
  {
    key: "gate_rule_ok",
    label: "ルールGate",
    value: (record) => record.gateRuleOk,
  },
  {
    key: "success_probability",
    label: "事前成功確率",
    value: (record) => record.successProbability,
  },
  {
    key: "expected_value",
    label: "事前期待値",
    value: (record) => record.expectedValue,
  },
  {
    key: "pre_env_sign",
    label: "環境認識サイン",
    value: (record) => record.preEnvironment.sign,
  },
  {
    key: "pre_env_trend4h_up",
    label: "4時間足上昇",
    value: (record) => record.preEnvironment.trend4hUp,
  },
  {
    key: "pre_env_range4h",
    label: "4時間足レンジ",
    value: (record) => record.preEnvironment.range4h,
  },
  {
    key: "pre_env_support15m",
    label: "15分足サポート",
    value: (record) => record.preEnvironment.support15m,
  },
  {
    key: "pre_env_long_wick15m",
    label: "15分足長いヒゲ",
    value: (record) => record.preEnvironment.longWick15m,
  },
  {
    key: "pre_env_flag",
    label: "フラッグ",
    value: (record) => record.preEnvironment.flag,
  },
  {
    key: "pre_env_triangle",
    label: "三角持ち合い",
    value: (record) => record.preEnvironment.triangle,
  },
  {
    key: "pre_env_london",
    label: "ロンドン時間",
    value: (record) => record.preEnvironment.london,
  },
  {
    key: "pre_env_new_york",
    label: "ニューヨーク時間",
    value: (record) => record.preEnvironment.newYork,
  },
  {
    key: "pre_env_as_planned",
    label: "計画通りの環境",
    value: (record) => record.preEnvironment.asPlanned,
  },
  {
    key: "post_side",
    label: "取引方向",
    value: (record) => record.postSide,
  },
  {
    key: "post_result",
    label: "取引結果",
    value: (record) => record.postResult,
  },
  {
    key: "post_profit_loss",
    label: "損益",
    value: (record) => record.postProfitLoss,
  },
  {
    key: "post_risk_reward",
    label: "実際のRR",
    value: (record) => record.postRiskReward,
  },
  {
    key: "post_rule_respected",
    label: "取引後ルール遵守",
    value: (record) => record.postRuleRespected,
  },
  {
    key: "post_within_hypothesis",
    label: "想定内",
    value: (record) => record.postWithinHypothesis,
  },
  {
    key: "post_good_participation",
    label: "納得できる参加",
    value: (record) => record.postGoodParticipation,
  },
  {
    key: "unexpected_reason",
    label: "想定外理由",
    value: (record) => record.unexpectedReason,
  },
  {
    key: "pre_note",
    label: "取引前メモ",
    value: (record, includeNotes) => includeNotes ? record.preNote : null,
  },
  {
    key: "post_reference_point",
    label: "振り返りポイント",
    value: (record, includeNotes) =>
      includeNotes ? record.postReferencePoint : null,
  },
  {
    key: "post_note",
    label: "取引後メモ",
    value: (record, includeNotes) => includeNotes ? record.postNote : null,
  },
] as const;
