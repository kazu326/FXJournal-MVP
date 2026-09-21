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
    label: "はい",
    className: "border-emerald-500 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  },
  {
    value: "no",
    label: "いいえ",
    className: "border-rose-500 bg-rose-50 text-rose-800 hover:bg-rose-100",
  },
  {
    value: "unknown",
    label: "わからない",
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
  const learningAidMessage = question.learningAid?.imageSrc
    ? question.learningAid.videoUrl
      ? "判断に迷う場合は、参考画像または講師の解説動画で確認できます。"
      : "判断に迷う場合は、参考画像で確認できます。"
    : "判断に迷う場合は、参考動画で確認できます。";

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

        {question.learningAid && (
          <div
            key={question.id}
            className="mt-4 space-y-3 rounded-xl border border-blue-100 bg-blue-50 p-3"
            data-testid={`attention-learning-aid-${question.id}`}
          >
            <p className="m-0 text-sm leading-relaxed text-zinc-700">
              {learningAidMessage}
            </p>
            {question.learningAid.imageSrc && question.learningAid.imageAlt && (
              <details>
                <summary className="min-h-11 cursor-pointer py-2 text-sm font-bold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                  参考画像を見る
                </summary>
                <img
                  src={question.learningAid.imageSrc}
                  alt={question.learningAid.imageAlt}
                  loading="lazy"
                  className="mt-2 h-auto w-full max-w-full rounded-xl border border-blue-100 bg-white"
                />
              </details>
            )}
            {question.learningAid.videoUrl && question.learningAid.videoLabel && (
              <a
                href={question.learningAid.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center font-bold text-blue-700 underline decoration-blue-300 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {question.learningAid.videoLabel}
              </a>
            )}
          </div>
        )}

        {question.memoExamples && question.memoExamples.length > 0 && (
          <details
            key={`memo-examples-${question.id}`}
            className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-3"
            data-testid={`attention-memo-examples-${question.id}`}
          >
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-bold text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              メモ例を見る
            </summary>
            <ul className="mb-3 mt-0 space-y-3 pl-5 text-sm leading-relaxed text-zinc-700">
              {question.memoExamples.map((example) => (
                <li key={example}>{example}</li>
              ))}
            </ul>
          </details>
        )}

        <label className="mt-4 block text-sm font-semibold text-zinc-700">
          気づいたこと（任意）
          <textarea
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder="確認したことや迷った点を短く残せます"
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
