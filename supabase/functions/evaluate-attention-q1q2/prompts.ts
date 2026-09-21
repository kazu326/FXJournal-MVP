import { Q1_REASON_CODES, Q2_REASON_CODES } from "./constants.ts";
import type { Q1Input, Q2Input } from "./types.ts";

export function buildQ1Prompt(input: Q1Input): string {
  return [
    "Evaluate only whether the supplied confirmed H4 market features indicate an uptrend.",
    "Return yes, no, or unknown. Do not advise buying, entering, forecast price, win rate, or profit.",
    `Allowed reason_codes: ${Q1_REASON_CODES.join(", ")}.`,
    "These features are a v0.1 experimental machine proxy, not instructor rules.",
    JSON.stringify(input),
  ].join("\n");
}
export function buildQ2Prompt(input: Q2Input): string {
  return [
    "Using only the supplied market features, evaluate whether normal chart judgment can continue.",
    "Consider cross-asset stress, abnormal volatility, cash-out conditions, and macro proximity.",
    "Return yes, no, or unknown. Do not make a trade or entry recommendation.",
    `Allowed reason_codes: ${Q2_REASON_CODES.join(", ")}.`,
    "These features are a v0.1 experimental machine proxy, not instructor rules.",
    JSON.stringify(input),
  ].join("\n");
}
