import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { Card, CardContent } from "../components/ui/card";
import { Clock, AlertCircle, Shield, TrendingUp, TrendingDown, Sparkles, Activity, HelpCircle } from "lucide-react";
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
}

interface HistoryPageProps {
  session: Session | null;
}

export default function HistoryPage({ session }: HistoryPageProps) {
  const [logs, setLogs] = useState<TradeLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("trade_logs")
        .select("*")
        .eq("user_id", session.user.id)
        .is("voided_at", null)
        .order("occurred_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Error fetching trade logs:", err);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const formatType = (type: LogType) => {
    switch (type) {
      case "valid":
        return {
          label: "取引",
          icon: Activity,
          color: "text-blue-600 bg-blue-50 border-blue-100",
          cardBg: "bg-blue-50/30",
        };
      case "skip":
        return {
          label: "見送り",
          icon: Shield,
          color: "text-emerald-600 bg-emerald-50 border-emerald-100",
          cardBg: "bg-[#E8F8ED]",
        };
      case "invalid":
        return {
          label: "ルール違反",
          icon: AlertCircle,
          color: "text-red-600 bg-red-50 border-red-100",
          cardBg: "bg-white",
        };
      default:
        return {
          label: type,
          icon: HelpCircle,
          color: "text-zinc-600 bg-zinc-50 border-zinc-100",
          cardBg: "bg-white",
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
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-zinc-600 font-medium">読み込み中...</span>
      </div>
    );
  }

  const validCount = logs.filter((l) => l.log_type === "valid").length;
  const skipCount = logs.filter((l) => l.log_type === "skip").length;

  return (
    <main className="min-h-dvh px-4 py-6">
      <div className="max-w-md mx-auto space-y-6">
        <div className="px-1 space-y-1">
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <span>📋</span> 履歴
          </h2>
          <p className="text-xs font-bold text-zinc-500">
            直近{logs.length}件：取引 {validCount}回 / 見送り {skipCount}回
          </p>
        </div>

        {logs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-zinc-500">
              まだトレード履歴がありません。
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => {
              const typeInfo = formatType(log.log_type);
              return (
                <button
                  key={log.id}
                  className="w-full text-left transition-transform active:scale-[0.98]"
                >
                  <Card className={`w-full rounded-2xl !bg-transparent glass-panel backdrop-blur-xl hover:border-blue-200 transition-colors ${typeInfo.cardBg}`}>
                    <CardContent className="p-4 space-y-3">
                      {/* 1行目: 日付と種別 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-zinc-500 text-sm">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(log.occurred_at).toLocaleString("ja-JP", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${typeInfo.color}`}>
                          {log.log_type === "skip" ? <typeInfo.icon className="h-2.5 w-2.5" /> : <typeInfo.icon className="h-2.5 w-2.5" />}
                          {typeInfo.label}
                          {log.log_type === "skip" && <Sparkles className="h-2.5 w-2.5 ml-0.5" />}
                        </span>
                      </div>

                      {/* 2行目: 取引前チェックの要約 */}
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-zinc-400 font-bold">RR</span>
                          <span className={`text-xs font-bold ${log.log_type === "skip"
                            ? log.gate_rr_ok ? "text-green-600" : "text-zinc-400"
                            : log.gate_rr_ok ? "text-green-600" : "text-red-500"
                            }`}>
                            {log.gate_rr_ok ? "○" : log.log_type === "skip" ? "-" : "×"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-zinc-400 font-bold">リスク</span>
                          <span className={`text-xs font-bold ${log.log_type === "skip"
                            ? log.gate_risk_ok ? "text-green-600" : "text-zinc-400"
                            : log.gate_risk_ok ? "text-green-600" : "text-red-500"
                            }`}>
                            {log.gate_risk_ok ? "○" : log.log_type === "skip" ? "-" : "×"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-zinc-400 font-bold">ルール</span>
                          <span className={`text-xs font-bold ${log.log_type === "skip"
                            ? log.gate_rule_ok ? "text-green-600" : "text-zinc-400"
                            : log.gate_rule_ok ? "text-green-600" : "text-red-500"
                            }`}>
                            {log.gate_rule_ok ? "○" : log.log_type === "skip" ? "-" : "×"}
                          </span>
                        </div>
                      </div>

                      {/* 3行目: 取引後チェックの要約 */}
                      <div className="pt-2 border-t border-zinc-50">
                        {!log.completed_at ? (
                          <div className="flex items-center gap-1.5 text-zinc-400">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span className="text-xs font-bold">記録未完成</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                              <Shield className={`h-3.5 w-3.5 ${log.post_gate_kept ? "text-blue-500" : "text-zinc-300"}`} />
                              <span className="text-xs text-zinc-600 font-medium">
                                遵守: <span className="font-bold">{log.post_gate_kept ? "○" : "×"}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {log.post_within_hypothesis ? (
                                <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <TrendingDown className="h-3.5 w-3.5 text-orange-500" />
                              )}
                              <span className="text-xs text-zinc-600 font-medium">
                                想定内: <span className="font-bold">{log.post_within_hypothesis ? "○" : "×"}</span>
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 4行目: 仮説情報 */}
                      <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-medium">
                        <div className="flex items-center gap-1">
                          <span>成功確率:</span>
                          <span className="text-zinc-600">{labelProb(log.success_prob)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>期待値:</span>
                          <span className="text-zinc-600">{labelEV(log.expected_value)}</span>
                        </div>
                      </div>

                      {/* 見送り時の一言補強 */}
                      {log.log_type === "skip" && (
                        <div className="pt-1 italic text-[10px] text-emerald-600 font-bold">
                          ※ ノートレードも立派な一手です。規律を守れました！
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
