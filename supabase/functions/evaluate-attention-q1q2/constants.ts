export const EXPERIMENTAL_PROXY_LABEL =
  "v0.1 experimental machine proxy; not instructor rules (講師ルールではない)";

export const JEV_SCOPE = "gate_q1_q2";
export const JEV_MODEL = "jev-latest";
export const PROMPT_VERSION = "q1q2-v0.1";
export const FEATURE_VERSION = "q1q2-features-v0.1";

// Experimental machine-proxy parameters, not the instructor's rules.
export const SWING_FLAT_ATR_RATIO = 0.1;
export const NORMAL_MOVE_BASELINE_TRADING_DAYS = 20;
export const MINIMUM_H4_BARS = 300;

export const Q1_REASON_CODES = [
  "higher_high",
  "lower_high",
  "flat_high",
  "higher_low",
  "lower_low",
  "flat_low",
  "ema_structure_supportive",
  "ema_structure_unsupportive",
  "price_above_ema100",
  "price_below_ema100",
  "mixed_structure",
  "insufficient_data",
] as const;
export const Q2_REASON_CODES = [
  "cross_asset_stress",
  "abnormal_volatility",
  "dollar_stress",
  "rates_stress",
  "macro_event_proximity",
  "normal_environment",
  "mixed_environment",
  "insufficient_data",
] as const;
