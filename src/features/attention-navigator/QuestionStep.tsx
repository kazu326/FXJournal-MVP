import type {
  AttentionAnswer,
  AttentionQuestion,
  AttentionQuestionId,
} from "./types";

type QuestionStepProps = {
  question: AttentionQuestion<AttentionQuestionId>;
  current: number;
  total: number;
  reason: string;
  disabled: boolean;
  onReasonChange: (reason: string) => void;
  onAnswer: (answer: AttentionAnswer) => void;
};

const ANSWERS: Array<{
  value: AttentionAnswer;
  label: string;
  className: string;
}> = [
  {
    value: "yes",
    label: "YES",
    className: "border-emerald-500 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  },
  {
    value: "no",
    label: "NO",
    className: "border-rose-500 bg-rose-50 text-rose-800 hover:bg-rose-100",
  },
  {
    value: "unknown",
    label: "?",
    className: "border-amber-500 bg-amber-50 text-amber-900 hover:bg-amber-100",
  },
];

export function QuestionStep({
  question,
  current,
  total,
  reason,
  disabled,
  onReasonChange,
  onAnswer,
}: QuestionStepProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
        <span>{question.displayNumber}</span>
        <span aria-label={`${total}問中${current}問目`}>
          {current} / {total}
        </span>
      </div>

      <div
        className="h-2 overflow-hidden rounded-full bg-zinc-100"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
      >
        <div
          className="h-full rounded-full bg-blue-600 transition-[width]"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="m-0 text-xs font-bold uppercase tracking-wide text-blue-600">
          {question.title}
        </p>
        <h2 className="m-0 mt-2 text-xl font-black leading-snug text-zinc-900">
          {question.prompt}
        </h2>
        <ul className="mt-4 space-y-2 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
          {question.guidance.map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden>•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <label className="mt-4 block text-sm font-semibold text-zinc-700">
          理由メモ（任意）
          <textarea
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder="確認した事実を短く残せます"
            className="mt-2 w-full resize-none rounded-xl border border-zinc-300 bg-white p-3 text-base font-normal text-zinc-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </label>

        <fieldset className="mt-4" disabled={disabled}>
          <legend className="sr-only">回答を選択</legend>
          <div className="grid grid-cols-3 gap-2">
            {ANSWERS.map((answer) => (
              <button
                key={answer.value}
                type="button"
                data-testid={`attention-answer-${answer.value}`}
                onClick={() => onAnswer(answer.value)}
                className={`min-h-14 rounded-xl border-2 text-base font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-wait disabled:opacity-50 ${answer.className}`}
              >
                {answer.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  );
}

