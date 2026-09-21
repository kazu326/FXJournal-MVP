import type { Q1_REASON_CODES, Q2_REASON_CODES } from "./constants.ts";

export type OhlcBar = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type Direction = "up" | "down" | "flat";
export type JevAnswer = "yes" | "no" | "unknown";
export type Q1ReasonCode = (typeof Q1_REASON_CODES)[number];
export type Q2ReasonCode = (typeof Q2_REASON_CODES)[number];

export type Q1Input = {
  proxy_label: string;
  symbol: string;
  timeframe: "H4";
  last_confirmed_bar_at: string;
  close: number;
  atr14: number;
  swing_high: { previous: number; latest: number; direction: Direction };
  swing_low: { previous: number; latest: number; direction: Direction };
  ema100: { current: number; three_bars_ago: number };
  ema200: { current: number; three_bars_ago: number };
  close_vs_ema100_atr: number;
  ema100_vs_ema200_atr: number;
};

export type AssetKey = "gold" | "usTech" | "sp500" | "btc" | "dxy" | "us10y";

export type AssetMove = {
  available: boolean;
  return_1h_pct?: number;
  return_4h_pct?: number;
  move_vs_normal_1h?: number | null;
};

export type YieldMove = {
  available: boolean;
  change_1h_bps?: number;
};

export type MacroEvent =
  | { available: false }
  | {
      available: true;
      name: string;
      impact: "high";
      minutes_from_event: number;
    };

export type Q2Input = {
  proxy_label: string;
  snapshot_at: string;
  gold: AssetMove;
  us_tech: AssetMove;
  sp500: AssetMove;
  btc: AssetMove;
  dxy: AssetMove;
  us10y: YieldMove;
  macro_event: MacroEvent;
};

export type JevOutput<TReason extends string> = {
  proxy_label: string;
  answer: JevAnswer;
  confidence: number;
  reason_codes: TReason[];
};

export type Q1Output = JevOutput<Q1ReasonCode>;
export type Q2Output = JevOutput<Q2ReasonCode>;

export class ExperimentError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ExperimentError";
  }
}
