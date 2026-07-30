import {
  CalendarDays,
  CircleAlert,
  CircleCheck,
  Info,
  ListChecks,
} from "lucide-react";
import type { AnalysisBehaviorDetails } from "../insights";

interface AnalysisInsightsProps {
  details: AnalysisBehaviorDetails;
  totalRecords: number;
}

const toneStyles = {
  positive: {
    icon: CircleCheck,
    className: "border-emerald-200 bg-emerald-50/70 text-emerald-800",
    iconClassName: "text-emerald-600",
  },
  attention: {
    icon: CircleAlert,
    className: "border-amber-200 bg-amber-50/70 text-amber-900",
    iconClassName: "text-amber-600",
  },
  neutral: {
    icon: Info,
    className: "border-slate-200 bg-slate-50 text-slate-800",
    iconClassName: "text-blue-600",
  },
} as const;

function formatRate(rate: number | null): string {
  return rate === null ? "—" : `${rate}%`;
}

export default function AnalysisInsights({
  details,
  totalRecords,
}: AnalysisInsightsProps) {
  const mixItems = [
    {
      label: "計画内の取引",
      count: details.mix.valid,
      className: "bg-blue-600",
    },
    {
      label: "ルール外",
      count: details.mix.invalid,
      className: "bg-amber-500",
    },
    {
      label: "見送り",
      count: details.mix.skip,
      className: "bg-emerald-500",
    },
  ];
  const maxWeekdayCount = Math.max(
    1,
    ...details.weekdays.map((weekday) => weekday.count),
  );

  return (
    <section
      data-testid="analysis-insights"
      aria-labelledby="analysis-insights-title"
      className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-0 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
            Behavior Insights
          </p>
          <h2
            id="analysis-insights-title"
            className="m-0 mt-1 text-xl font-black text-slate-950"
          >
            記録から見える行動
          </h2>
          <p className="mb-0 mt-1 text-xs leading-relaxed text-slate-500">
            損益ではなく、判断の内訳と振り返りデータの揃い方を確認します。
          </p>
        </div>
        <span className="border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
          記録ベース
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <article className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <ListChecks className="size-4 text-blue-600" aria-hidden />
            <h3 className="m-0 text-sm font-black text-slate-900">
              記録の内訳
            </h3>
          </div>
          <div className="mt-4 space-y-3">
            {mixItems.map((item) => {
              const rate =
                totalRecords === 0
                  ? 0
                  : Math.round((item.count / totalRecords) * 100);
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-bold text-slate-700">
                      {item.label}
                    </span>
                    <span className="tabular-nums text-slate-500">
                      {item.count}件
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden bg-slate-100">
                    <div
                      className={`h-full ${item.className}`}
                      style={{ width: `${rate}%` }}
                      aria-hidden
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mb-0 mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
            実取引 {details.mix.live}件・練習 {details.mix.practice}件
          </p>
        </article>

        <article className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <CircleCheck className="size-4 text-blue-600" aria-hidden />
            <h3 className="m-0 text-sm font-black text-slate-900">
              データ充足度
            </h3>
          </div>
          <div className="mt-4 space-y-3">
            {details.coverage.map((item) => (
              <div key={item.key}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-bold text-slate-700">{item.label}</span>
                  <span className="tabular-nums text-slate-500">
                    {item.count}/{item.total}・{formatRate(item.rate)}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label={`${item.label} ${formatRate(item.rate)}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={item.rate ?? 0}
                  className="mt-1.5 h-2 overflow-hidden bg-slate-100"
                >
                  <div
                    className="h-full bg-blue-600"
                    style={{ width: `${item.rate ?? 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mb-0 mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
            割合は取引記録を母数にしています。
          </p>
        </article>

        <article className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-blue-600" aria-hidden />
            <h3 className="m-0 text-sm font-black text-slate-900">
              曜日別の記録
            </h3>
          </div>
          <div
            className="mt-4 grid h-28 grid-cols-7 items-end gap-2"
            aria-label="曜日別の記録件数"
          >
            {details.weekdays.map((weekday) => {
              const height =
                weekday.count === 0
                  ? 4
                  : Math.max(
                      14,
                      Math.round((weekday.count / maxWeekdayCount) * 76),
                    );
              return (
                <div
                  key={weekday.label}
                  className="flex min-w-0 flex-col items-center justify-end gap-1"
                >
                  <span className="text-[10px] font-bold tabular-nums text-slate-500">
                    {weekday.count}
                  </span>
                  <div
                    className={
                      weekday.count === 0
                        ? "w-full max-w-6 bg-slate-200"
                        : "w-full max-w-6 bg-blue-600"
                    }
                    style={{ height }}
                    aria-hidden
                  />
                  <span className="text-[10px] font-bold text-slate-600">
                    {weekday.label}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mb-0 mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
            記録した日数 {details.activeDays}日
          </p>
        </article>
      </div>

      <div
        className="mt-4 grid gap-3 lg:grid-cols-2"
        aria-label="記録から確認できたこと"
      >
        {details.insights.map((insight) => {
          const style = toneStyles[insight.tone];
          const Icon = style.icon;
          return (
            <article
              key={insight.id}
              className={`rounded-lg border p-4 ${style.className}`}
            >
              <div className="flex items-start gap-3">
                <Icon
                  className={`mt-0.5 size-4 shrink-0 ${style.iconClassName}`}
                  aria-hidden
                />
                <div>
                  <h3 className="m-0 text-sm font-black">{insight.title}</h3>
                  <p className="mb-0 mt-1 text-xs leading-relaxed opacity-80">
                    {insight.detail}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
