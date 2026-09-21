import type { JevAnswer } from "./types.ts";

export type Comparison =
  | "same"
  | "different"
  | "human_unknown"
  | "jev_unknown"
  | "both_unknown"
  | "not_answered";

export function compareHumanAndJev(
  human: JevAnswer | null,
  jev: JevAnswer,
): Comparison {
  if (human === null) return "not_answered";
  if (human === "unknown" && jev === "unknown") return "both_unknown";
  if (human === "unknown") return "human_unknown";
  if (jev === "unknown") return "jev_unknown";
  return human === jev ? "same" : "different";
}
