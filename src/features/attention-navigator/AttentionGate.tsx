import { GATE_QUESTIONS } from "./questions";
import { QuestionStep } from "./QuestionStep";
import type { AttentionAnswer } from "./types";

type AttentionGateProps = {
  questionIndex: number;
  reason: string;
  disabled: boolean;
  onReasonChange: (reason: string) => void;
  onAnswer: (answer: AttentionAnswer) => void;
};

export function AttentionGate(props: AttentionGateProps) {
  const question = GATE_QUESTIONS[props.questionIndex] ?? GATE_QUESTIONS[0];
  return (
    <QuestionStep
      question={question}
      current={props.questionIndex + 1}
      total={GATE_QUESTIONS.length}
      reason={props.reason}
      disabled={props.disabled}
      onReasonChange={props.onReasonChange}
      onAnswer={props.onAnswer}
    />
  );
}

