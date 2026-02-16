import { useEffect, useState } from "react";
import { Activity, Users, GraduationCap, Flame, Download, Bell, AlertTriangle } from "lucide-react";
import { downloadCSV } from "../../lib/csv-export";
import { supabase } from "../../lib/supabase";
import { DashboardSummaryCard } from "./components/DashboardSummaryCard";
import { NoTradeChart } from "./components/NoTradeChart";
import { CheckAdherenceChart } from "./components/CheckAdherenceChart";
import { LearningEffectChart } from "./components/LearningEffectChart";
import { RiskAlertChart } from "./components/RiskAlertChart";
import { TimeZoneBiasChart } from "./components/TimeZoneBiasChart";

type AdminUserStatsRow = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  email: string | null;
  total_trades: number | null;
  win_rate: number | null;
  avg_risk_reward: number | null;
  learning_progress: number | null;
  last_trade_date: string | null;
  subscription_status: string | null;
};

export default function AdminDashboard() {
  const [data, setData] = useState<AdminUserStatsRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: userData, error } = await supabase
          .from('v_behavior_compliance_report' as any)
          .select('*');

        if (error) throw error;
        setData(userData || []);
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleExportComplianceReport = async () => {
    try {
      const { data: exportData, error } = await supabase
        .from('v_behavior_compliance_report' as any)
        .select('*');

      if (error) throw error;

      const filename = `compliance_report_${new Date().toISOString().split('T')[0]}.csv`;
      downloadCSV(exportData, filename);
    } catch (error) {
      console.error('CSV export failed:', error);
      alert('CSVエクスポートに失敗しました');
    }
  };

  // const totalUsers = data.length;
  // 仮の集計（実際はAPIから取得するか、v_behavior_compliance_reportを拡張して取得）
  const activeUsers = data.filter(u => u.subscription_status === 'active').length;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2 text-slate-100">
            <Activity className="w-6 h-6 text-emerald-400" />
            <span>FX Journal Admin</span>
            <span className="text-xs font-normal text-slate-500 ml-2 border border-slate-700 px-2 py-0.5 rounded-full">v2.0</span>
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

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardSummaryCard
          title="アクティブユーザー数"
          value={`${activeUsers}人`}
          subValue="(+12%)"
          subLabel="今週ログイン人数"
          trend="up"
          trendValue="+12%"
          icon={Users}
          color="emerald"
          dalay={0}
        />
        <DashboardSummaryCard
          title="継続率"
          value="85%"
          subValue="(30日)"
          subLabel="7日継続率 92%"
          trend="up"
          trendValue="+5%"
          icon={Activity}
          color="blue"
          dalay={0.1}
        />
        <DashboardSummaryCard
          title="要フォロー候補"
          value="8人"
          subLabel="最終活動 > 7日"
          trend="neutral"
          icon={Bell}
          color="amber"
          dalay={0.2}
        />
        <DashboardSummaryCard
          title="離脱危険信号"
          value="3人"
          subLabel="初回利用から3日以内ストップ"
          trend="down"
          trendValue="+1"
          icon={AlertTriangle}
          color="rose"
          dalay={0.3}
        />
      </div>

      {/* Charts Grid - Top Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <NoTradeChart />
        </div>
        <div className="lg:col-span-2">
          <CheckAdherenceChart />
        </div>
      </div>

      {/* Charts Grid - Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <LearningEffectChart />
        </div>
        <div className="lg:col-span-1">
          <RiskAlertChart />
        </div>
        <div className="lg:col-span-1">
          <TimeZoneBiasChart />
        </div>
      </div>

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
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Loading data...
                  </td>
                </tr>
              ) : (
                data.slice(0, 10).map((user) => (
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
                      {user.total_trades || 0}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-300">
                      {user.win_rate ? `${Number(user.win_rate).toFixed(1)}%` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user.learning_progress ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-mono text-slate-300">{Number(user.learning_progress).toFixed(0)}%</span>
                          {Number(user.learning_progress) >= 80 ? (
                            <GraduationCap className="w-4 h-4 text-emerald-400" />
                          ) : Number(user.learning_progress) > 0 ? (
                            <Flame className="w-4 h-4 text-amber-400" />
                          ) : (
                            <div className="w-4 h-4" />
                          )}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500 text-xs">
                      {user.last_trade_date ? new Date(user.last_trade_date).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
