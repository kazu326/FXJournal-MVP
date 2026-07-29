import type { FeedbackSignal } from "./types";

export type FeedbackSignalInput = {
  supportRequested: boolean;
  recordCount: number;
  answers: Array<number | null>;
};

/**
 * Mirrors the governed SQL rule order used when a monthly check-in is submitted.
 * The result is a routing signal, not a clinical or investment-risk score.
 */
export function deriveFeedbackSignal({
  supportRequested,
  recordCount,
  answers,
}: FeedbackSignalInput): FeedbackSignal {
  if (supportRequested) return "support_requested";
  if (recordCount === 0) return "insufficient_data";

  const scoredAnswers = answers.filter(
    (answer): answer is number => answer !== null,
  );
  if (scoredAnswers.some((answer) => answer <= 2)) return "followup";

  const average =
    scoredAnswers.length === 0
      ? 0
      : scoredAnswers.reduce((sum, answer) => sum + answer, 0) /
        scoredAnswers.length;

  if (average >= 4) return "on_track";
  return "monitoring";
}
