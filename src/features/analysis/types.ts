export const ANALYSIS_SCHEMA_VERSION = "1.0";

export type AnalysisPeriod = "30d" | "90d" | "all";

export type AnalysisRecordType = "valid" | "invalid" | "skip" | "unknown";

export type AnalysisTradeMode = "live" | "practice" | null;

export type AnalysisRecord = {
  id: string;
  occurredAt: string;
  recordType: AnalysisRecordType;
  mode: AnalysisTradeMode;
  completedAt: string | null;
  rulesetVersion: string | null;
  currencyPair: string | null;
  accountBalance: number | null;
  stopLossPips: number | null;
  takeProfitPips: number | null;
  stopLossAmount: number | null;
  takeProfitAmount: number | null;
  calculatedLot: number | null;
  riskPercent: number | null;
  riskRewardRatio: number | null;
  gateTradeCountOk: boolean | null;
  gateRrOk: boolean | null;
  gateRiskOk: boolean | null;
  gateRuleOk: boolean | null;
  successProbability: string | null;
  expectedValue: string | null;
  preEnvironment: {
    sign: boolean | null;
    trend4hUp: boolean | null;
    range4h: boolean | null;
    support15m: boolean | null;
    longWick15m: boolean | null;
    flag: boolean | null;
    triangle: boolean | null;
    london: boolean | null;
    newYork: boolean | null;
    asPlanned: boolean | null;
  };
  postSide: string | null;
  postResult: string | null;
  postProfitLoss: number | null;
  postRiskReward: string | null;
  postRuleRespected: boolean | null;
  postWithinHypothesis: boolean | null;
  postGoodParticipation: boolean | null;
  unexpectedReason: string | null;
  preNote: string | null;
  postReferencePoint: string | null;
  postNote: string | null;
};

export type AnalysisSummary = {
  totalRecords: number;
  tradeRecords: number;
  skipRecords: number;
  completedRecords: number;
  completionRate: number | null;
  ruleEvidenceCount: number;
  ruleAdherenceRate: number | null;
};

const nullableString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const nullableNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const nullableBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  return null;
};

const recordType = (value: unknown): AnalysisRecordType => {
  if (value === "valid" || value === "invalid" || value === "skip") {
    return value;
  }
  return "unknown";
};

const tradeMode = (value: unknown): AnalysisTradeMode => {
  if (value === "live" || value === "practice") return value;
  return null;
};

export function normalizeAnalysisRecord(
  source: Record<string, unknown>,
): AnalysisRecord {
  const id = nullableString(source.id);
  const occurredAt =
    nullableString(source.occurred_at) ??
    nullableString(source.trade_datetime);

  if (!id || !occurredAt) {
    throw new Error("分析対象の記録にIDまたは記録日時がありません");
  }

  return {
    id,
    occurredAt,
    recordType: recordType(source.log_type),
    mode: tradeMode(source.mode),
    completedAt: nullableString(source.completed_at),
    rulesetVersion: nullableString(source.ruleset_version),
    currencyPair:
      nullableString(source.currency_pair_symbol) ??
      nullableString(source.currency_pair),
    accountBalance: nullableNumber(source.account_balance),
    stopLossPips: nullableNumber(source.stop_loss_pips),
    takeProfitPips: nullableNumber(source.take_profit_pips),
    stopLossAmount: nullableNumber(source.stop_loss_amount),
    takeProfitAmount: nullableNumber(source.take_profit_amount),
    calculatedLot: nullableNumber(source.calculated_lot),
    riskPercent: nullableNumber(source.risk_percent),
    riskRewardRatio: nullableNumber(source.risk_reward_ratio),
    gateTradeCountOk: nullableBoolean(source.gate_trade_count_ok),
    gateRrOk: nullableBoolean(source.gate_rr_ok),
    gateRiskOk: nullableBoolean(source.gate_risk_ok),
    gateRuleOk: nullableBoolean(source.gate_rule_ok),
    successProbability: nullableString(source.success_prob),
    expectedValue: nullableString(source.expected_value),
    preEnvironment: {
      sign: nullableBoolean(source.pre_env_sign),
      trend4hUp: nullableBoolean(source.pre_env_trend4h_up),
      range4h: nullableBoolean(source.pre_env_range4h),
      support15m: nullableBoolean(source.pre_env_support15m),
      longWick15m: nullableBoolean(source.pre_env_long_wick15m),
      flag: nullableBoolean(source.pre_env_flag),
      triangle: nullableBoolean(source.pre_env_triangle),
      london: nullableBoolean(source.pre_env_london),
      newYork: nullableBoolean(source.pre_env_newyork),
      asPlanned: nullableBoolean(source.pre_env_as_planned),
    },
    postSide: nullableString(source.post_side),
    postResult:
      nullableString(source.post_result) ?? nullableString(source.result),
    postProfitLoss: nullableNumber(source.post_pl),
    postRiskReward: nullableString(source.post_rr_text),
    postRuleRespected:
      nullableBoolean(source.post_rule_respected) ??
      nullableBoolean(source.post_gate_kept),
    postWithinHypothesis:
      nullableBoolean(source.post_in_expected_range) ??
      nullableBoolean(source.post_within_hypothesis),
    postGoodParticipation: nullableBoolean(source.post_good_participation),
    unexpectedReason: nullableString(source.unexpected_reason),
    preNote:
      nullableString(source.pre_note) ?? nullableString(source.note),
    postReferencePoint: nullableString(source.post_reference_point),
    postNote: nullableString(source.post_note),
  };
}
