import { JUDGMENT_QUESTIONS } from "./questions";
import { QuestionStep } from "./QuestionStep";
import type { AttentionAnswer } from "./types";

type JudgmentNavigatorProps = {
  questionIndex: number;
  reason: string;
  disabled: boolean;
  onReasonChange: (reason: string) => void;
  onAnswer: (answer: AttentionAnswer) => void;
};

export function JudgmentNavigator(props: JudgmentNavigatorProps) {
  const question =
    JUDGMENT_QUESTIONS[props.questionIndex] ?? JUDGMENT_QUESTIONS[0];
  return (
    <QuestionStep
      question={question}
      current={props.questionIndex + 1}
      total={JUDGMENT_QUESTIONS.length}
      reason={props.reason}
      disabled={props.disabled}
      onReasonChange={props.onReasonChange}
      onAnswer={props.onAnswer}
    />
  );
}

