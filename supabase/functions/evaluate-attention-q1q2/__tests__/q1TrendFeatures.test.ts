import {
  buildQ1TrendFeatures,
  calculateAtr,
  calculateEma,
  findPivotHighs,
  findPivotLows,
  latestTwo,
  swingDirection,
} from "../features/q1TrendFeatures";
import type { OhlcBar } from "../types";

const barsFromCloses = (closes: number[]): OhlcBar[] =>
  closes.map((close, index) => ({
    time: new Date(Date.UTC(2026, 0, 1, index * 4)).toISOString(),
    open: close,
    high: close + 1,
    low: close - 1,
    close,
  }));

describe("Q1 trend features", () => {
  test("calculates EMA100 and EMA200 from SMA seeds", () => {
    const values = Array.from({ length: 205 }, (_, index) => index + 1);
    expect(calculateEma(values, 100)[99]).toBeCloseTo(50.5);
    expect(calculateEma(values, 100)[100]).toBeCloseTo(51.5);
    expect(calculateEma(values, 200)[199]).toBeCloseTo(100.5);
    expect(calculateEma(values, 200)[200]).toBeCloseTo(101.5);
  });

  test("calculates Wilder ATR14", () => {
    const atr = calculateAtr(barsFromCloses(Array.from({ length: 20 }, (_, index) => index + 10)));
    expect(atr[14]).toBeCloseTo(2);
    expect(atr[19]).toBeCloseTo(2);
  });

  test("detects strict two-bars-each-side pivot highs and lows", () => {
    const bars = barsFromCloses([5, 6, 10, 7, 6, 5, 1, 4, 5]);
    expect(findPivotHighs(bars).map((pivot) => pivot.index)).toEqual([2]);
    expect(findPivotLows(bars).map((pivot) => pivot.index)).toEqual([6]);
  });

  test("returns latest and previous pivots", () => {
    expect(
      latestTwo([
        { index: 1, time: "a", value: 1 },
        { index: 2, time: "b", value: 2 },
        { index: 3, time: "c", value: 3 },
      ]),
    ).toEqual({
      previous: { index: 2, time: "b", value: 2 },
      latest: { index: 3, time: "c", value: 3 },
    });
    expect(latestTwo([{ index: 1, time: "a", value: 1 }])).toBeNull();
  });

  test.each([
    [101.1, 100, 10, "up"],
    [98.9, 100, 10, "down"],
    [100.9, 100, 10, "flat"],
  ])("classifies swing %p vs %p as %p", (latest, previous, atr, expected) => {
    expect(swingDirection(latest as number, previous as number, atr as number)).toBe(expected);
  });

  test("rejects invalid ATR", () => {
    expect(() => swingDirection(2, 1, 0)).toThrow("ATR14");
  });

  test("rejects fewer than 300 confirmed bars", () => {
    expect(() => buildQ1TrendFeatures("XAU/USD", barsFromCloses(Array(299).fill(100)))).toThrow(
      "At least 300",
    );
  });

  test("rejects insufficient pivots", () => {
    const trending = barsFromCloses(Array.from({ length: 300 }, (_, index) => 100 + index));
    expect(() => buildQ1TrendFeatures("XAU/USD", trending)).toThrow("Two confirmed pivot");
  });

  test("rejects invalid ATR before deriving normalized features", () => {
    const flat = Array.from({ length: 300 }, (_, index) => ({
      time: new Date(Date.UTC(2026, 0, 1, index * 4)).toISOString(),
      open: 100,
      high: 100,
      low: 100,
      close: 100,
    }));
    expect(() => buildQ1TrendFeatures("XAU/USD", flat)).toThrow("ATR14 is unavailable or invalid");
  });

  test("builds the market-only Q1 schema from 300 confirmed bars", () => {
    const bars = barsFromCloses(
      Array.from({ length: 300 }, (_, index) => 100 + index * 0.05 + Math.sin(index / 3) * 5),
    );
    const result = buildQ1TrendFeatures("XAU/USD", bars);
    expect(result.proxy_label).toContain("experimental machine proxy");
    expect(result.timeframe).toBe("H4");
    expect(["up", "down", "flat"]).toContain(result.swing_high.direction);
    expect(["up", "down", "flat"]).toContain(result.swing_low.direction);
    expect(Number.isFinite(result.close_vs_ema100_atr)).toBe(true);
    expect(Number.isFinite(result.ema100_vs_ema200_atr)).toBe(true);
  });
});
