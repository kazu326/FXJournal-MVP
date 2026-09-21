import {
  buildAssetMove,
  buildQ2MarketEnvironmentFeatures,
  buildYieldMove,
  median,
  percentageReturn,
} from "../features/q2MarketEnvironmentFeatures";

const baseline = {
  current: 102,
  oneHourAgo: 100,
  fourHoursAgo: 98,
  baselineAbsolute1hReturns: [0.5, 1, 1.5],
  baselineTradingDays: 20,
};

describe("Q2 market-environment features", () => {
  test("calculates 1h and 4h percentage returns", () => {
    expect(percentageReturn(102, 100)).toBeCloseTo(2);
    expect(buildAssetMove(baseline)).toEqual(
      expect.objectContaining({ return_1h_pct: 2, return_4h_pct: expect.any(Number) }),
    );
    expect(buildAssetMove(baseline).return_4h_pct).toBeCloseTo(4.08163265);
  });

  test.each([
    [[3, 1, 2], 2],
    [[4, 1, 3, 2], 2.5],
    [[], null],
  ])("calculates median", (values, expected) => {
    expect(median(values as number[])).toBe(expected);
  });

  test("calculates move versus the 20-trading-day median", () => {
    expect(buildAssetMove(baseline).move_vs_normal_1h).toBeCloseTo(2);
  });

  test("marks a missing asset unavailable", () => {
    expect(buildAssetMove(null)).toEqual({ available: false });
  });

  test("uses null rather than zero when baseline history is insufficient", () => {
    expect(buildAssetMove({ ...baseline, baselineTradingDays: 19 }).move_vs_normal_1h).toBeNull();
  });

  test("calculates US10Y one-hour basis-point change", () => {
    expect(buildYieldMove({ currentPercent: 4.35, oneHourAgoPercent: 4.25 })).toEqual({
      available: true,
      change_1h_bps: expect.any(Number),
    });
    expect(buildYieldMove({ currentPercent: 4.35, oneHourAgoPercent: 4.25 }).change_1h_bps).toBeCloseTo(10);
  });

  test("preserves macro unavailable instead of treating it as no event", () => {
    const result = buildQ2MarketEnvironmentFeatures({
      snapshotAt: "2026-09-21T00:00:00.000Z",
      gold: null,
      usTech: null,
      sp500: null,
      btc: null,
      dxy: null,
      us10y: null,
      macroEvent: { available: false },
    });
    expect(result.macro_event).toEqual({ available: false });
    expect(result.gold).toEqual({ available: false });
  });
});
