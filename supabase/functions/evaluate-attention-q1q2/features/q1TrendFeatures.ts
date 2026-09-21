import {
  EXPERIMENTAL_PROXY_LABEL,
  MINIMUM_H4_BARS,
  SWING_FLAT_ATR_RATIO,
} from "../constants.ts";
import { ExperimentError, type Direction, type OhlcBar, type Q1Input } from "../types.ts";

export type Pivot = { index: number; time: string; value: number };

const finite = (value: number) => Number.isFinite(value);

export function calculateEma(values: number[], period: number): Array<number | null> {
  const output: Array<number | null> = Array(values.length).fill(null);
  if (period <= 0 || values.length < period || values.some((value) => !finite(value))) {
    return output;
  }
  const seed = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  output[period - 1] = seed;
  const multiplier = 2 / (period + 1);
  for (let index = period; index < values.length; index += 1) {
    output[index] = values[index] * multiplier + (output[index - 1] as number) * (1 - multiplier);
  }
  return output;
}
export function calculateAtr(bars: OhlcBar[], period = 14): Array<number | null> {
  const output: Array<number | null> = Array(bars.length).fill(null);
  if (period <= 0 || bars.length < period + 1) return output;
  const trueRanges: number[] = [];
  for (let index = 1; index < bars.length; index += 1) {
    const bar = bars[index];
    const previous = bars[index - 1];
    if (![bar.high, bar.low, previous.close].every(finite)) return output;
    trueRanges.push(
      Math.max(
        bar.high - bar.low,
        Math.abs(bar.high - previous.close),
        Math.abs(bar.low - previous.close),
      ),
    );
  }
  let atr = trueRanges.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  output[period] = atr;
  for (let trIndex = period; trIndex < trueRanges.length; trIndex += 1) {
    atr = (atr * (period - 1) + trueRanges[trIndex]) / period;
    output[trIndex + 1] = atr;
  }
  return output;
}

export function findPivotHighs(bars: OhlcBar[]): Pivot[] {
  const pivots: Pivot[] = [];
  for (let index = 2; index < bars.length - 2; index += 1) {
    const value = bars[index].high;
    if (
      value > bars[index - 1].high &&
      value > bars[index - 2].high &&
      value > bars[index + 1].high &&
      value > bars[index + 2].high
    ) {
      pivots.push({ index, time: bars[index].time, value });
    }
  }
  return pivots;
}

export function findPivotLows(bars: OhlcBar[]): Pivot[] {
  const pivots: Pivot[] = [];
  for (let index = 2; index < bars.length - 2; index += 1) {
    const value = bars[index].low;
    if (
      value < bars[index - 1].low &&
      value < bars[index - 2].low &&
      value < bars[index + 1].low &&
      value < bars[index + 2].low
    ) {
      pivots.push({ index, time: bars[index].time, value });
    }
  }
  return pivots;
}

export function latestTwo(pivots: Pivot[]): { previous: Pivot; latest: Pivot } | null {
  if (pivots.length < 2) return null;
  return { previous: pivots[pivots.length - 2], latest: pivots[pivots.length - 1] };
}

export function swingDirection(latest: number, previous: number, atr14: number): Direction {
  if (!finite(atr14) || atr14 <= 0) {
    throw new ExperimentError("ATR_INVALID", "ATR14 must be a positive finite number.");
  }
  const difference = latest - previous;
  const tolerance = atr14 * SWING_FLAT_ATR_RATIO;
  if (difference > tolerance) return "up";
  if (difference < -tolerance) return "down";
  return "flat";
}

export function buildQ1TrendFeatures(symbol: string, bars: OhlcBar[]): Q1Input {
  if (bars.length < MINIMUM_H4_BARS) {
    throw new ExperimentError("INSUFFICIENT_H4_DATA", `At least ${MINIMUM_H4_BARS} confirmed H4 bars are required.`);
  }
  const closes = bars.map((bar) => bar.close);
  const atrSeries = calculateAtr(bars);
  const ema100Series = calculateEma(closes, 100);
  const ema200Series = calculateEma(closes, 200);
  const lastIndex = bars.length - 1;
  const atr14 = atrSeries[lastIndex];
  const ema100 = ema100Series[lastIndex];
  const ema100ThreeBarsAgo = ema100Series[lastIndex - 3];
  const ema200 = ema200Series[lastIndex];
  const ema200ThreeBarsAgo = ema200Series[lastIndex - 3];
  if (atr14 === null || !finite(atr14) || atr14 <= 0) {
    throw new ExperimentError("ATR_INVALID", "ATR14 is unavailable or invalid.");
  }
  if ([ema100, ema100ThreeBarsAgo, ema200, ema200ThreeBarsAgo].some((value) => value === null || !finite(value))) {
    throw new ExperimentError("INSUFFICIENT_H4_DATA", "EMA features are unavailable.");
  }
  const highs = latestTwo(findPivotHighs(bars));
  const lows = latestTwo(findPivotLows(bars));
  if (!highs || !lows) {
    throw new ExperimentError("INSUFFICIENT_PIVOTS", "Two confirmed pivot highs and lows are required.");
  }
  const close = bars[lastIndex].close;
  return {
    proxy_label: EXPERIMENTAL_PROXY_LABEL,
    symbol,
    timeframe: "H4",
    last_confirmed_bar_at: bars[lastIndex].time,
    close,
    atr14,
    swing_high: {
      previous: highs.previous.value,
      latest: highs.latest.value,
      direction: swingDirection(highs.latest.value, highs.previous.value, atr14),
    },
    swing_low: {
      previous: lows.previous.value,
      latest: lows.latest.value,
      direction: swingDirection(lows.latest.value, lows.previous.value, atr14),
    },
    ema100: { current: ema100 as number, three_bars_ago: ema100ThreeBarsAgo as number },
    ema200: { current: ema200 as number, three_bars_ago: ema200ThreeBarsAgo as number },
    close_vs_ema100_atr: (close - (ema100 as number)) / atr14,
    ema100_vs_ema200_atr: ((ema100 as number) - (ema200 as number)) / atr14,
  };
}
