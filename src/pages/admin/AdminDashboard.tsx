import { useEffect, useState, useMemo } from "react";
import { Activity, Users, GraduationCap, Flame, Download, Bell, AlertTriangle } from "lucide-react";
import { downloadCSV } from "../../lib/csv-export";
import { supabase } from "../../lib/supabase";
import { DashboardSummaryCard } from "./components/DashboardSummaryCard";
import { NoTradeChart } from "./components/NoTradeChart";
import type { NoTradeReason } from "./components/NoTradeChart";
import { CheckAdherenceChart } from "./components/CheckAdherenceChart";
import type { AdherenceData } from "./components/CheckAdherenceChart";
import { LearningEffectChart } from "./components/LearningEffectChart";
import { RiskAlertChart } from "./components/RiskAlertChart";
import type { RiskAlertData } from "./components/RiskAlertChart";
import { TimeZoneBiasChart } from "./components/TimeZoneBiasChart";
import type { TimeZoneData } from "./components/TimeZoneBiasChart";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

// Only the columns v_behavior_compliance_report actually has. The trade figures
// it was previously assumed to carry come from admin_user_metrics instead.
type AdminUserStatsRow = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  email: string | null;
  learning_completion_rate: number | null;
  subscription_status: string | null;
};

type UserMetricsRow = {
  user_id: string;
  total_trades: number | null;
  win_rate: number | null;
  last_activity_at: string | null;
};

// Shape returned by the public.admin_trade_metrics RPC. The aggregation runs in
// the database so this stays a fixed-size payload no matter how many logs exist.
type TradeMetrics = {
  window_days: number;
  total_logs: number;
  high_risk_count: number;
  short_interval_count: number;
  no_trade_rate: number;
  skip_reason_rate: number;
  skip_no_reason_rate: number;
  avg_continuity: number;
  win_rate_before: number;
  win_rate_after: number;
  night_ratio: number;
  by_weekday: { day: string; high_risk: number; short_interval: number }[];
  by_time_bucket: { time: string; count: number }[];
  by_week: { week: string; rate: number }[];
};

const EMPTY_METRICS: TradeMetrics = {
  window_days: 30,
  total_logs: 0,
  high_risk_count: 0,
  short_interval_count: 0,
  no_trade_rate: 0,
  skip_reason_rate: 0,
  skip_no_reason_rate: 0,
  avg_continuity: 0,
  win_rate_before: 0,
  win_rate_after: 0,
  night_ratio: 0,
  by_weekday: [],
  by_time_bucket: [],
  by_week: [],
};

const METRICS_WINDOW_DAYS = 30;

// src/lib/supabase/database.types.ts predates public.admin_trade_metrics, so the
// generated client has no signature for it. Narrow the call here rather than
// widening it to `any`; regenerating the types removes the need for this.
type AdminTradeMetricsRpc = (
  fn: 'admin_trade_metrics',
  args: { p_days: number },
) => Promise<{ data: TradeMetrics | null; error: { message: string } | null }>;

type AdminUserMetricsRpc = (
  fn: 'admin_user_metrics',
) => Promise<{ data: UserMetricsRow[] | null; error: { message: string } | null }>;

// ------------------------------------------------------------------
// Main Component
// ------------------------------------------------------------------

export default function AdminDashboard() {
  const [userStats, setUserStats] = useState<AdminUserStatsRow[]>([]);
  const [userMetrics, setUserMetrics] = useState<UserMetricsRow[]>([]);
  const [metrics, setMetrics] = useState<TradeMetrics>(EMPTY_METRICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Data
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch User Stats (Existing View)
        const { data: statsData, error: statsError } = await supabase
          .from('v_behavior_compliance_report' as any)
          .select('*');

        if (statsError) throw statsError;
        setUserStats(statsData || []);

        // 2. Fetch pre-aggregated trade metrics.
        // Aggregating in the database keeps this a single row: the raw logs are
        // never shipped to the browser, so the Data API row cap cannot silently
        // truncate the numbers as the member count grows.
        const callMetrics = supabase.rpc as unknown as AdminTradeMetricsRpc;
        const { data: metricsData, error: metricsError } = await callMetrics(
          'admin_trade_metrics',
          { p_days: METRICS_WINDOW_DAYS },
        );

        if (metricsError) throw metricsError;
        setMetrics(metricsData ?? EMPTY_METRICS);

        // 3. Fetch per-member trade figures for the summary table. One row per
        // member, so this is bounded by member count rather than log count.
        const callUserMetrics = supabase.rpc as unknown as AdminUserMetricsRpc;
        const { data: userMetricsData, error: userMetricsError } =
          await callUserMetrics('admin_user_metrics');

        if (userMetricsError) throw userMetricsError;
        setUserMetrics(userMetricsData ?? []);

      } catch (err: any) {
        console.error("Error fetching admin data:", err);
        setError(err.message || "データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Map the aggregated payload onto the shapes the chart components expect.
  const riskData = useMemo<RiskAlertData>(() => ({
    lotData: metrics.by_weekday.map((d) => ({ day: d.day, count: d.high_risk })),
    revengeData: metrics.by_weekday.map((d) => ({ day: d.day, count: d.short_interval })),
    lotIncreaseCount: metrics.high_risk_count,
    revengeTradeCount: metrics.short_interval_count,
  }), [metrics]);

  const adherenceData = useMemo<AdherenceData[]>(
    () => metrics.by_week,
    [metrics],
  );

  const timeZoneData = useMemo<TimeZoneData[]>(
    () => metrics.by_time_bucket,
    [metrics],
  );

  const noTradeData = useMemo<NoTradeReason[]>(() => ([
    { name: '条件不一致', value: metrics.skip_reason_rate, color: '#3b82f6' },
    { name: '理由なし/その他', value: metrics.skip_no_reason_rate, color: '#ef4444' },
  ]), [metrics]);

  const metricsByUser = useMemo(
    () => new Map(userMetrics.map((m) => [m.user_id, m])),
    [userMetrics],
  );

  // Aggregates for KPI Cards
  const activeUsers = userStats.filter(u => u.subscription_status === 'active').length;

  const handleExportComplianceReport = async () => {
    try {
      if (userStats.length > 0) {
        const filename = `compliance_report_${new Date().toISOString().split('T')[0]}.csv`;
        downloadCSV(userStats, filename);
      }
    } catch (error) {
      console.error('CSV export failed:', error);
      alert('CSVエクスポートに失敗しました');
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center text-rose-400 bg-rose-500/10 rounded-xl border border-rose-500/20">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-bold mb-2">データ読み込みエラー</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2 text-slate-100">
            <Activity className="w-6 h-6 text-emerald-400" />
            <span>FX Journal Admin</span>
            <span className="text-xs font-normal text-slate-500 ml-2 border border-slate-700 px-2 py-0.5 rounded-full">v2.1 Real-Data</span>
          </h1>
          <p className="text-sm text-slate-400">
            コックピットへようこそ。全ユーザーの行動データをリアルタイムで監視中。
          </p>
        </div>
        <button
          onClick={handleExportComplianceReport}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-sm font-medium rounded-lg transition-all hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
        >
          <Download className="w-4 h-4" />
          <span>CSVレポート出力</span>
        </button>
      </header>

      {/* KPI Cards Row (Using Real/Proxyl Data) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardSummaryCard
          title="アクティブユーザー"
          value={`${activeUsers}人`}
          subValue=""
          subLabel="Subscription Active"
          trend="neutral"
          icon={Users}
          color="emerald"
          dalay={0}
        />
        <DashboardSummaryCard
          title="月間ログ総数"
          value={`${metrics.total_logs}件`}
          subValue="(30日)"
          subLabel="ユーザー活動量"
          trend="up"
          trendValue=""
          icon={Activity}
          color="blue"
          dalay={0.1}
        />
        <DashboardSummaryCard
          title="平均継続日数"
          value={`${metrics.avg_continuity}日`}
          subLabel="事後検証完了ベース"
          trend="neutral"
          icon={Bell}
          color="amber"
          dalay={0.2}
        />
        <DashboardSummaryCard
          title="リスク警告"
          value={`${riskData.lotIncreaseCount + riskData.revengeTradeCount}件`}
          subLabel="High Risk / Short Interval"
          trend="down"
          trendValue=""
          icon={AlertTriangle}
          color="rose"
          dalay={0.3}
        />
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-500">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent mr-2"></div>
          Calculating Analytics...
        </div>
      ) : (
        <>
          {/* Charts Grid - Top Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <NoTradeChart
                data={noTradeData}
                totalNoTradeRate={metrics.no_trade_rate}
                successRateAfterLoss={0}
              />
            </div>
            <div className="lg:col-span-2">
              <CheckAdherenceChart
                data={adherenceData}
                avgContinuityDays={metrics.avg_continuity}
              />
            </div>
          </div>

          {/* Charts Grid - Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <LearningEffectChart
                winRateBefore={metrics.win_rate_before}
                winRateAfter={metrics.win_rate_after}
              />
            </div>
            <div className="lg:col-span-1">
              <RiskAlertChart data={riskData} />
            </div>
            <div className="lg:col-span-1">
              <TimeZoneBiasChart
                data={timeZoneData}
                nightShiftRatio={metrics.night_ratio}
              />
            </div>
          </div>
        </>
      )}

      {/* User List Section */}
      <div className="mt-8 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-400" />
            ユーザー別サマリー
          </h2>
          <span className="text-xs text-slate-500">上位 10 ユーザー表示中</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-800/50 text-slate-400 font-medium">
              <tr>
                <th className="px-6 py-3">ユーザー</th>
                <th className="px-6 py-3">サブスクリプション</th>
                <th className="px-6 py-3 text-right">トレード数</th>
                <th className="px-6 py-3 text-right">勝率</th>
                <th className="px-6 py-3 text-right">学習進捗</th>
                <th className="px-6 py-3 text-right">最終活動</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading && userStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Loading users...
                  </td>
                </tr>
              ) : (
                userStats.slice(0, 10).map((user) => {
                  const trade = metricsByUser.get(user.user_id);
                  return (
                  <tr key={user.user_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.username || user.email || ''}
                            className="w-8 h-8 rounded-full bg-slate-700 object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-300 border border-slate-600">
                            {(user.username || user.email || '?').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-slate-200 font-medium truncate max-w-[150px]">
                            {user.username || 'No Name'}
                          </span>
                          <span className="text-xs text-slate-500">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.subscription_status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }`}>
                        {user.subscription_status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-300">
                      {trade?.total_trades ?? 0}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-300">
                      {trade?.win_rate != null ? `${Number(trade.win_rate).toFixed(1)}%` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user.learning_completion_rate ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-mono text-slate-300">{Number(user.learning_completion_rate).toFixed(0)}%</span>
                          {Number(user.learning_completion_rate) >= 80 ? (
                            <GraduationCap className="w-4 h-4 text-emerald-400" />
                          ) : Number(user.learning_completion_rate) > 0 ? (
                            <Flame className="w-4 h-4 text-amber-400" />
                          ) : (
                            <div className="w-4 h-4" />
                          )}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500 text-xs">
                      {trade?.last_activity_at ? new Date(trade.last_activity_at).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
