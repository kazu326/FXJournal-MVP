import {
  EXPERIMENTAL_PROXY_LABEL,
  NORMAL_MOVE_BASELINE_TRADING_DAYS,
} from "../constants.ts";
import type { AssetMove, MacroEvent, Q2Input, YieldMove } from "../types.ts";

export type AssetMarketSeries = {
  current: number;
  oneHourAgo: number;
  fourHoursAgo: number;
  baselineAbsolute1hReturns: number[];
  baselineTradingDays: number;
};

export type YieldMarketSeries = { currentPercent: number; oneHourAgoPercent: number };

export function percentageReturn(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
export function median(values: number[]): number | null {
  const valid = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (valid.length === 0) return null;
  const middle = Math.floor(valid.length / 2);
  return valid.length % 2 === 0 ? (valid[middle - 1] + valid[middle]) / 2 : valid[middle];
}

export function buildAssetMove(series: AssetMarketSeries | null): AssetMove {
  if (!series) return { available: false };
  const return1h = percentageReturn(series.current, series.oneHourAgo);
  const return4h = percentageReturn(series.current, series.fourHoursAgo);
  if (return1h === null || return4h === null) return { available: false };
  const baseline =
    series.baselineTradingDays >= NORMAL_MOVE_BASELINE_TRADING_DAYS
      ? median(series.baselineAbsolute1hReturns)
      : null;
  return {
    available: true,
    return_1h_pct: return1h,
    return_4h_pct: return4h,
    move_vs_normal_1h: baseline !== null && baseline > 0 ? Math.abs(return1h) / baseline : null,
  };
}

export function buildYieldMove(series: YieldMarketSeries | null): YieldMove {
  if (!series || !Number.isFinite(series.currentPercent) || !Number.isFinite(series.oneHourAgoPercent)) {
    return { available: false };
  }
  return { available: true, change_1h_bps: (series.currentPercent - series.oneHourAgoPercent) * 100 };
}

export function buildQ2MarketEnvironmentFeatures(args: {
  snapshotAt: string;
  gold: AssetMarketSeries | null;
  usTech: AssetMarketSeries | null;
  sp500: AssetMarketSeries | null;
  btc: AssetMarketSeries | null;
  dxy: AssetMarketSeries | null;
  us10y: YieldMarketSeries | null;
  macroEvent: MacroEvent;
}): Q2Input {
  return {
    proxy_label: EXPERIMENTAL_PROXY_LABEL,
    snapshot_at: args.snapshotAt,
    gold: buildAssetMove(args.gold),
    us_tech: buildAssetMove(args.usTech),
    sp500: buildAssetMove(args.sp500),
    btc: buildAssetMove(args.btc),
    dxy: buildAssetMove(args.dxy),
    us10y: buildYieldMove(args.us10y),
    macro_event: args.macroEvent,
  };
}
