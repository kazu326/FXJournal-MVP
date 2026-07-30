import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Check,
  Clipboard,
  Database,
  Download,
  FileSpreadsheet,
  LockKeyhole,
  Monitor,
  ShieldCheck,
} from "lucide-react";
import { downloadAnalysisCsv } from "../features/analysis/csv";
import { summarizeAnalysisRecords } from "../features/analysis/metrics";
import { buildAnalysisPrompt } from "../features/analysis/prompt";
import { fetchAnalysisRecords } from "../features/analysis/query";
import { ANALYSIS_COLUMNS } from "../features/analysis/schema";
import type {
  AnalysisPeriod,
  AnalysisRecord,
} from "../features/analysis/types";

interface AnalysisPageProps {
  userId: string;
  onBack: () => void;
}

const periodOptions: Array<{ value: AnalysisPeriod; label: string }> = [
  { value: "30d", label: "30日" },
  { value: "90d", label: "90日" },
  { value: "all", label: "全期間" },
];

const recordTypeLabels: Record<AnalysisRecord["recordType"], string> = {
  valid: "取引",
  invalid: "ルール外",
  skip: "見送り",
  unknown: "その他",
};

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function useDesktopAnalysis(): boolean {
  const [isDesktop, setIsDesktop] = useState(() =>
    window.matchMedia("(min-width: 1024px)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

export default function AnalysisPage({
  userId,
  onBack,
}: AnalysisPageProps) {
  const isDesktop = useDesktopAnalysis();
  const [period, setPeriod] = useState<AnalysisPeriod>("30d");
  const [includeNotes, setIncludeNotes] = useState(false);
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [loadedPeriod, setLoadedPeriod] = useState<AnalysisPeriod | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isDesktop) return;

    let cancelled = false;

    void fetchAnalysisRecords(userId, period)
      .then((nextRecords) => {
        if (!cancelled) {
          setRecords(nextRecords);
          setLoadedPeriod(period);
        }
      })
      .catch((fetchError: unknown) => {
        if (cancelled) return;
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "分析データを取得できませんでした";
        setRecords([]);
        setError(message);
        setLoadedPeriod(period);
      });

    return () => {
      cancelled = true;
    };
  }, [isDesktop, period, userId]);

  const summary = useMemo(
    () => summarizeAnalysisRecords(records),
    [records],
  );
  const preview = useMemo(() => records.slice(-5).reverse(), [records]);
  const loading = isDesktop && loadedPeriod !== period && !error;

  const handlePeriodChange = (nextPeriod: AnalysisPeriod) => {
    setError("");
    setPeriod(nextPeriod);
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(buildAnalysisPrompt(period));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("プロンプトをコピーできませんでした");
    }
  };

  if (!isDesktop) {
    return (
      <main
        data-testid="analysis-mobile-notice"
        className="mx-auto max-w-md px-1 py-8"
      >
        <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Monitor className="size-7" aria-hidden />
          </div>
          <h1 className="mb-0 mt-4 text-xl font-black text-slate-900">
            分析機能はPCで利用できます
          </h1>
          <p className="mb-0 mt-3 text-sm leading-relaxed text-slate-600">
            PCでこのページを開くと、期間集計、CSV保存、AI振り返りガイドを利用できます。
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <ArrowLeft className="size-4" aria-hidden />
            ホームへ戻る
          </button>
        </section>
      </main>
    );
  }

  return (
    <main
      data-testid="analysis-page"
      className="relative mx-auto w-full max-w-7xl pb-8"
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-bold text-slate-500 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ArrowLeft className="size-4" aria-hidden />
            ホーム
          </button>
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <BarChart3 className="size-6" aria-hidden />
            </div>
            <div>
              <p className="m-0 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                Analysis Workspace
              </p>
              <h1 className="m-0 mt-1 text-3xl font-black tracking-tight text-slate-950">
                記録を分析する
              </h1>
            </div>
          </div>
          <p className="mb-0 mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
            売買の答えではなく、記録習慣と判断の根拠を振り返るための分析画面です。
          </p>
        </div>

        <div
          className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
          aria-label="分析期間"
        >
          {periodOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={period === option.value}
              onClick={() => handlePeriodChange(option.value)}
              className={`min-h-10 rounded-lg px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                period === option.value
                  ? "bg-slate-900 text-white"
                  : "bg-transparent text-slate-600 hover:bg-slate-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
        >
          {error}
        </div>
      ) : null}

      <section
        aria-label="分析概要"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        {[
          {
            label: "記録",
            value: summary.totalRecords,
            detail: `取引 ${summary.tradeRecords}・見送り ${summary.skipRecords}`,
          },
          {
            label: "取引後記録",
            value: formatPercent(summary.completionRate),
            detail: `${summary.completedRecords}件完了`,
          },
          {
            label: "ルール遵守",
            value: formatPercent(summary.ruleAdherenceRate),
            detail:
              summary.ruleEvidenceCount > 0
                ? `${summary.ruleEvidenceCount}件の回答から集計`
                : "回答データなし",
          },
          {
            label: "CSV仕様",
            value: "v1",
            detail: `${ANALYSIS_COLUMNS.length}列・型付き`,
          },
        ].map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="m-0 text-xs font-bold text-slate-500">{item.label}</p>
            <p className="m-0 mt-2 text-2xl font-black text-slate-950">
              {loading ? "…" : item.value}
            </p>
            <p className="mb-0 mt-1 text-xs text-slate-500">{item.detail}</p>
          </article>
        ))}
      </section>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]">
        <section
          aria-labelledby="analysis-records-title"
          className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2
                id="analysis-records-title"
                className="m-0 text-lg font-black text-slate-900"
              >
                分析対象データ
              </h2>
              <p className="mb-0 mt-1 text-xs text-slate-500">
                最新5件を確認してから保存できます。
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
              <LockKeyhole className="size-3.5" aria-hidden />
              本人の記録のみ
            </span>
          </div>

          {loading ? (
            <div
              data-testid="analysis-loading"
              className="flex min-h-56 items-center justify-center text-sm font-medium text-slate-500"
            >
              分析データを読み込んでいます…
            </div>
          ) : preview.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-5 text-center">
              <Database className="size-8 text-slate-300" aria-hidden />
              <p className="mb-0 mt-3 font-bold text-slate-700">
                この期間の記録はありません
              </p>
              <p className="mb-0 mt-1 text-sm text-slate-500">
                期間を変更するか、新しい記録を残してから確認してください。
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500">
                    <th className="px-5 py-3 font-bold">日付</th>
                    <th className="px-4 py-3 font-bold">種別</th>
                    <th className="px-4 py-3 font-bold">通貨ペア</th>
                    <th className="px-4 py-3 font-bold">ルール</th>
                    <th className="px-4 py-3 font-bold">取引後記録</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((record) => (
                    <tr
                      key={record.id}
                      className="border-t border-slate-100 text-sm text-slate-700"
                    >
                      <td className="px-5 py-3.5 font-medium">
                        {formatDate(record.occurredAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        {recordTypeLabels[record.recordType]}
                      </td>
                      <td className="px-4 py-3.5">
                        {record.currencyPair ?? "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        {record.postRuleRespected === null
                          ? "—"
                          : record.postRuleRespected
                            ? "遵守"
                            : "要確認"}
                      </td>
                      <td className="px-4 py-3.5">
                        {record.completedAt ? "完了" : "未完了"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="space-y-5">
          <section
            aria-labelledby="analysis-download-title"
            className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-600 to-indigo-700 p-5 text-white shadow-lg shadow-blue-600/15"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <FileSpreadsheet className="size-5" aria-hidden />
              </div>
              <div>
                <h2
                  id="analysis-download-title"
                  className="m-0 text-lg font-black"
                >
                  分析データを保存
                </h2>
                <p className="mb-0 mt-1 text-xs leading-relaxed text-blue-100">
                  個人IDや講師メモを含まない、AI分析向けのCSVです。
                </p>
              </div>
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/15 bg-white/10 p-3">
              <input
                type="checkbox"
                checked={includeNotes}
                onChange={(event) => setIncludeNotes(event.target.checked)}
                className="mt-0.5 size-4 rounded border-white/50"
              />
              <span>
                <span className="block text-sm font-bold">
                  自由記述を含める
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-blue-100">
                  メモに個人情報がないことを確認してから有効にしてください。
                </span>
              </span>
            </label>

            <button
              type="button"
              data-testid="analysis-download"
              disabled={loading || records.length === 0}
              onClick={() =>
                downloadAnalysisCsv(records, period, includeNotes)
              }
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-blue-700 shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 motion-reduce:transition-none"
            >
              <Download className="size-4" aria-hidden />
              CSVをダウンロード
            </button>
          </section>

          <section
            aria-labelledby="analysis-ai-title"
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <ShieldCheck className="size-5" aria-hidden />
              </div>
              <div>
                <h2
                  id="analysis-ai-title"
                  className="m-0 text-base font-black text-slate-900"
                >
                  AIで安全に振り返る
                </h2>
                <p className="mb-0 mt-1 text-xs leading-relaxed text-slate-500">
                  売買推奨を避け、記録習慣を見るための指示文です。
                </p>
              </div>
            </div>

            <ol className="mb-0 mt-4 space-y-2 pl-5 text-xs leading-relaxed text-slate-600">
              <li>CSVを保存する</li>
              <li>下の指示文をコピーする</li>
              <li>利用するAIへCSVと指示文を送る</li>
            </ol>

            <button
              type="button"
              data-testid="analysis-copy-prompt"
              onClick={() => void handleCopyPrompt()}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {copied ? (
                <Check className="size-4 text-emerald-600" aria-hidden />
              ) : (
                <Clipboard className="size-4" aria-hidden />
              )}
              {copied ? "コピーしました" : "AI振り返り用の指示文をコピー"}
            </button>

            <p className="mb-0 mt-3 text-[11px] leading-relaxed text-slate-500">
              この画面から外部AIへデータが自動送信されることはありません。利用先のデータ設定をご確認ください。
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
