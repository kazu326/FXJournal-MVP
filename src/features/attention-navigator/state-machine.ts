import { GATE_QUESTIONS, JUDGMENT_QUESTIONS } from "./questions";
import type {
  AttentionAnswer,
  AttentionAnswerRecord,
  GateQuestionId,
  GateResult,
  JudgmentQuestionId,
} from "./types";

export type GateTransition =
  | { kind: "next"; nextIndex: number }
  | { kind: "complete"; result: GateResult };

export function resolveGateTransition(
  questionId: GateQuestionId,
  answer: AttentionAnswer,
): GateTransition {
  if (answer === "unknown") {
    return { kind: "complete", result: "hold" };
  }

  if (answer === "no") {
    return {
      kind: "complete",
      result:
        questionId === "playbook_target" || questionId === "market_environment"
          ? "stop"
          : "hold",
    };
  }

  const currentIndex = GATE_QUESTIONS.findIndex(
    (question) => question.id === questionId,
  );
  if (currentIndex === GATE_QUESTIONS.length - 1) {
    return { kind: "complete", result: "pass" };
  }

  return { kind: "next", nextIndex: currentIndex + 1 };
}

export function isHardVeto(
  questionId: JudgmentQuestionId,
  answer: AttentionAnswer,
) {
  return (
    answer === "no" &&
    (questionId === "volatility_sufficient" || questionId === "risk_defined")
  );
}

export function nextJudgmentIndex(questionId: JudgmentQuestionId) {
  const currentIndex = JUDGMENT_QUESTIONS.findIndex(
    (question) => question.id === questionId,
  );
  return currentIndex < JUDGMENT_QUESTIONS.length - 1
    ? currentIndex + 1
    : null;
}

export function elapsedSeconds(startedAt: string, finishedAt: string) {
  const elapsed = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  return Math.max(0, Math.round(elapsed / 1000));
}

export function answersElapsedSeconds(answers: AttentionAnswerRecord[]) {
  return Math.max(
    0,
    Math.round(
      answers.reduce((total, answer) => total + answer.elapsed_ms, 0) / 1000,
    ),
  );
}
