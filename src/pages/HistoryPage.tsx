import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import {
  Clock,
  AlertCircle,
  Shield,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Activity,
  HelpCircle,
  X,
  FileText,
  ChevronRight,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";

export type LogType = "valid" | "invalid" | "skip";
export type SuccessProb = "high" | "mid" | "low";
export type ExpectedValue = "plus" | "minus" | "unknown";

export interface TradeLog {
  id: string;
  occurred_at: string;
  log_type: LogType;
  gate_trade_count_ok: boolean | null;
  gate_rr_ok: boolean | null;
  gate_risk_ok: boolean | null;
  gate_rule_ok: boolean | null;
  success_prob: SuccessProb | null;
  expected_value: ExpectedValue | null;
  post_gate_kept: boolean | null;
  post_within_hypothesis: boolean | null;
  unexpected_reason: string | null;
  completed_at: string | null;
  voided_at: string | null;
  note: string | null;
}

interface TradeData {
  created_at: string;
  emotion_score: number | null;
}

interface HistoryPageProps {
  session: Session | null;
}

export default function HistoryPage({ session }: HistoryPageProps) {
  const [logs, setLogs] = useState<TradeLog[]>([]);
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<TradeLog | null>(null);

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      setLoading(true);

      // trade_logs の取得
      const { data: logData, error: logError } = await supabase
        .from("trade_logs")
        .select("*")
        .eq("user_id", session.user.id)
        .is("voided_at", null)
        .order("occurred_at", { ascending: false })
        .limit(30);

      if (logError) throw logError;
      setLogs(logData || []);

      // trades (感情スコアなど) の取得
      const { data: tradeData, error: tradeError } = await supabase
        .from("trades")
        .select("created_at, emotion_score")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (tradeError) throw tradeError;
      setTrades(tradeData || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // tradeLogの発生日時に最も近いtradeのemotion_scoreを探す（推定）
  const getEstimatedEmotionScore = (occurredAt: string) => {
    if (!trades.length) return null;
    const logTime = new Date(occurredAt).getTime();

    // 誤差12時間以内のもので最も近いものを探す
    let closestScore: number | null = null;
    let minDiff = 12 * 60 * 60 * 1000;

    for (const t of trades) {
      if (!t.emotion_score) continue;
      const tTime = new Date(t.created_at).getTime();
      const diff = Math.abs(tTime - logTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestScore = t.emotion_score;
      }
    }
    return closestScore;
  };

  const formatType = (type: LogType) => {
    switch (type) {
      case "valid":
        return {
          label: "取引",
          icon: Activity,
          color: "text-blue-600 bg-blue-50 border-blue-200",
          bg: "bg-blue-50/40",
          border: "border-blue-200",
        };
      case "skip":
        return {
          label: "見送り",
          icon: Shield,
          color: "text-emerald-600 bg-emerald-50 border-emerald-200",
          bg: "bg-emerald-50/40",
          border: "border-emerald-200",
        };
      case "invalid":
        return {
          label: "ルール違反",
          icon: AlertCircle,
          color: "text-red-600 bg-red-50 border-red-200",
          bg: "bg-white",
          border: "border-zinc-200",
        };
      default:
        return {
          label: type,
          icon: HelpCircle,
          color: "text-zinc-600 bg-zinc-50 border-zinc-200",
          bg: "bg-white",
          border: "border-zinc-200",
        };
    }
  };

  const labelProb = (v: SuccessProb | null) => {
    if (!v) return "未入力";
    return v === "high" ? "高" : v === "mid" ? "中" : "低";
  };

  const labelEV = (v: ExpectedValue | null) => {
    if (!v) return "未入力";
    return v === "plus" ? "＋" : v === "minus" ? "－" : "不明";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-zinc-400">
        読み込み中...
      </div>
    );
  }

  const validCount = logs.filter((l) => l.log_type === "valid").length;
  const skipCount = logs.filter((l) => l.log_type === "skip").length;

  return (
    <div className="px-4 pb-24 h-full">
      {/* ヘッダー */}
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          📋 履歴
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          直近{logs.length}件：取引 {validCount}回 / 見送り {skipCount}回
        </p>
      </div>

      {logs.length === 0 ? (
        <p className="text-center text-zinc-400 mt-12">
          まだトレード履歴がありません。
        </p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const typeInfo = formatType(log.log_type);
            const TypeIcon = typeInfo.icon;

            return (
              <button
                key={log.id}
                onClick={() => setSelectedLog(log)}
                // 要素が block として扱われるように明確化し、flexbox 展開を防止
                className={`block w-full text-left rounded-2xl border ${typeInfo.border} ${typeInfo.bg} shadow-sm p-4 active:scale-[0.98] transition-transform overflow-hidden relative`}
              >
                {/* 1行目: 日付と種別バッジ */}
                <div className="flex flex-wrap items-center justify-between mb-2 gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 flex-shrink-0">
                    <Clock size={13} />
                    {new Date(log.occurred_at).toLocaleString("ja-JP", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${typeInfo.color} flex items-center gap-1 flex-shrink-0 whitespace-nowrap`}
                  >
                    {log.log_type === "skip" ? (
                      <Shield size={11} className="flex-shrink-0" />
                    ) : (
                      <TypeIcon size={11} className="flex-shrink-0" />
                    )}
                    {typeInfo.label}
                    {log.log_type === "skip" && <Sparkles size={11} className="flex-shrink-0" />}
                  </span>
                </div>

                {/* 2行目: Gate要約 */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600 mb-2">
                  <span className="whitespace-nowrap flex items-center gap-1">
                    RR
                    <span className={log.log_type === "skip" ? "text-zinc-400 font-bold" : log.gate_rr_ok ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                      {log.log_type === "skip" ? "−" : log.gate_rr_ok ? "○" : "×"}
                    </span>
                  </span>
                  <span className="whitespace-nowrap flex items-center gap-1">
                    リスク
                    <span className={log.log_type === "skip" ? "text-zinc-400 font-bold" : log.gate_risk_ok ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                      {log.log_type === "skip" ? "−" : log.gate_risk_ok ? "○" : "×"}
                    </span>
                  </span>
                  <span className="whitespace-nowrap flex items-center gap-1">
                    ルール
                    <span className={log.log_type === "skip" ? "text-zinc-400 font-bold" : log.gate_rule_ok ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                      {log.log_type === "skip" ? "−" : log.gate_rule_ok ? "○" : "×"}
                    </span>
                  </span>
                </div>

                {/* 3行目: 取引後 or 未完成 */}
                {!log.completed_at ? (
                  <div className="flex items-center gap-1 text-xs text-zinc-400 mt-1">
                    <HelpCircle size={12} className="flex-shrink-0" />
                    <span className="truncate">記録未完成</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600 mt-1">
                    <span className="whitespace-nowrap flex items-center gap-1">
                      遵守:
                      <span className={log.post_gate_kept ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                        {log.post_gate_kept ? "○" : "×"}
                      </span>
                    </span>
                    <span className="whitespace-nowrap flex items-center gap-1">
                      {log.post_within_hypothesis ? (
                        <TrendingUp size={12} className="text-emerald-500" />
                      ) : (
                        <TrendingDown size={12} className="text-red-400" />
                      )}
                      想定内:
                      <span className={log.post_within_hypothesis ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                        {log.post_within_hypothesis ? "○" : "×"}
                      </span>
                    </span>
                  </div>
                )}

                {/* 見送り補強メッセージ */}
                {log.log_type === "skip" && (
                  <p className="text-xs text-emerald-600 mt-2 font-medium truncate">
                    ※ ノートレードも立派な一手です。規律を守れました！
                  </p>
                )}

                {/* 詳細タップ誘導のアイコンは右上に絶対配置して邪魔にならないように */}
                <div className="absolute top-1/2 right-3 -translate-y-1/2 flex items-center justify-center opacity-30 text-zinc-400 pointer-events-none">
                  <ChevronRight size={16} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* 詳細モーダル（コンパクト・中央配置） */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setSelectedLog(null)}
        >
          {/* ▼ 画面中央のダイアログとして配置し、スマホでも見切れないように高さを抑え余白を詰める */}
          <div
            className="w-full max-w-sm bg-white rounded-2xl flex flex-col overflow-hidden shadow-xl"
            style={{ maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* モーダルヘッダー */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-zinc-100 flex-shrink-0">
              <div>
                <p className="text-[10px] text-zinc-400">
                  {new Date(selectedLog.occurred_at).toLocaleString("ja-JP", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <h2 className="text-sm font-bold text-zinc-800">
                    {formatType(selectedLog.log_type).label}の記録
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* モーダルコンテンツ（高さを節約） */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {/* Gate前チェック */}
              <section>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: "RR比", key: "gate_rr_ok" },
                    { label: "リスク", key: "gate_risk_ok" },
                    { label: "ルール", key: "gate_rule_ok" },
                    { label: "取引回数", key: "gate_trade_count_ok" },
                  ].map(({ label, key }) => {
                    const val = selectedLog[key as keyof TradeLog] as boolean | null;
                    const isSkip = selectedLog.log_type === "skip";
                    const displayState = isSkip ? "skip" : val === true ? "ok" : val === false ? "ng" : "none";

                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs ${displayState === "skip"
                          ? "bg-zinc-50 text-zinc-500"
                          : displayState === "ok"
                            ? "bg-emerald-50 text-emerald-700 font-bold"
                            : displayState === "ng"
                              ? "bg-red-50 text-red-600 font-bold"
                              : "bg-zinc-50 text-zinc-400"
                          }`}
                      >
                        <span className="truncate">{label}</span>
                        <span>
                          {displayState === "skip" ? "−" : displayState === "ok" ? "○" : displayState === "ng" ? "×" : "−"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* 仮説＆感情 */}
              <section className="bg-zinc-50 rounded-xl p-2.5 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[9px] text-zinc-400 font-bold mb-0.5">成功確率</p>
                  <p className="text-xs font-bold text-zinc-700">{labelProb(selectedLog.success_prob)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-zinc-400 font-bold mb-0.5">期待値</p>
                  <p className="text-xs font-bold text-zinc-700">{labelEV(selectedLog.expected_value)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-zinc-400 font-bold mb-0.5">感情</p>
                  <p className="text-xs font-bold text-zinc-700">{getEstimatedEmotionScore(selectedLog.occurred_at) ?? "−"}</p>
                </div>
              </section>

              {/* 取引後チェック */}
              {selectedLog.completed_at ? (
                <section>
                  <div className="space-y-1.5">
                    <div
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${selectedLog.post_gate_kept
                        ? "bg-blue-50/50 border-blue-100 text-blue-700"
                        : "bg-red-50 border-red-100 text-red-600"
                        }`}
                    >
                      <span className="font-medium">Gateの遵守</span>
                      <span className="font-bold">{selectedLog.post_gate_kept ? "遵守した" : "違反した"}</span>
                    </div>
                    <div
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${selectedLog.post_within_hypothesis
                        ? "bg-emerald-50/50 border-emerald-100 text-emerald-700"
                        : "bg-orange-50 border-orange-100 text-orange-600"
                        }`}
                    >
                      <span className="font-medium">相場は想定内</span>
                      <span className="font-bold">{selectedLog.post_within_hypothesis ? "想定内" : "想定外"}</span>
                    </div>
                  </div>
                </section>
              ) : (
                <div className="py-2.5 rounded-xl border border-dashed border-zinc-200 text-center text-xs text-zinc-400">
                  <Activity size={16} className="mx-auto mb-1 opacity-20" />
                  取引後の振り返りなし
                </div>
              )}

              {/* ノート */}
              {selectedLog.note && (
                <section>
                  <div className="bg-zinc-50 rounded-xl p-2.5 text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap border border-zinc-100 max-h-24 overflow-y-auto">
                    {selectedLog.note}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
