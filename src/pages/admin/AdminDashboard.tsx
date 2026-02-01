import { useEffect, useState } from "react";
import { Activity, Users, GraduationCap, Flame } from "lucide-react";
import { supabase } from "../../lib/supabase";

type AdminUserStatsRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  joined_at: string | null;
  total_xp: number | null;
  level: number | null;
  streak_days: number | null;
  total_trades: number | null;
  trading_days: number | null;
  last_trade_date: string | null;
  lectures_accessed: number | null;
  lectures_completed: number | null;
  last_learning_date: string | null;
};

export default function AdminDashboard() {
  const [data, setData] = useState<AdminUserStatsRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const { data: rows, error } = await supabase
        .from("admin_user_stats")
        .select("*")
        .order("total_xp", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Failed to fetch admin_user_stats", error);
        setData([]);
      } else {
        setData((rows ?? []) as AdminUserStatsRow[]);
      }
      setLoading(false);
    };

    fetchStats();
  }, []);

  const totalUsers = data.length;
  const totalTrades = data.reduce(
    (sum, u) => sum + (u.total_trades ?? 0),
    0
  );
  const avgTradesPerUser =
    totalUsers > 0 ? (totalTrades / totalUsers).toFixed(1) : "0.0";
  const avgLevel =
    totalUsers > 0
      ? (data.reduce((s, u) => s + (u.level ?? 1), 0) / totalUsers).toFixed(1)
      : "1.0";

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          <span>管理ダッシュボード</span>
        </h1>
        <p className="text-sm text-slate-400">
          ユーザーのトレード記録と学習状況のサマリーを確認できます。
        </p>
      </header>

      {/* サマリーカード */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>総ユーザー数</span>
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-semibold">{totalUsers}</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>総トレード数</span>
            <Activity className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-semibold">{totalTrades}</div>
          <div className="text-xs text-slate-400">
            1ユーザーあたり平均 {avgTradesPerUser} 回
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>平均レベル</span>
            <GraduationCap className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-semibold">{avgLevel}</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>ストリーク上位</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xs text-slate-400">
            最長ストリーク:{" "}
            {data.length > 0
              ? Math.max(...data.map((u) => u.streak_days ?? 0))
              : 0}{" "}
            日
          </div>
        </div>
      </section>

      {/* ユーザー一覧テーブル */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">
            ユーザー別サマリー
          </h2>
          <span className="text-xs text-slate-500">
            上位 {data.length} ユーザー（XP順）
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-900/80 border-b border-slate-800">
              <tr className="text-left text-slate-400">
                <th className="px-4 py-2 font-normal">ユーザー</th>
                <th className="px-4 py-2 font-normal">XP / Lv</th>
                <th className="px-4 py-2 font-normal">トレード</th>
                <th className="px-4 py-2 font-normal">学習</th>
                <th className="px-4 py-2 font-normal">最終活動</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-slate-400"
                  >
                    読み込み中…
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-slate-400"
                  >
                    データがまだありません。
                  </td>
                </tr>
              ) : (
                data.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-slate-800/60 hover:bg-slate-900/60"
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt={u.username ?? ""}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-800" />
                        )}
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-slate-100">
                            {u.username ?? "No name"}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            参加日:{" "}
                            {u.joined_at
                              ? new Date(u.joined_at).toLocaleDateString()
                              : "-"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-2">
                      <div className="flex flex-col">
                        <span className="text-xs">
                          XP: {u.total_xp !== null ? u.total_xp : 0}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Lv {u.level ?? 1} / ストリーク {u.streak_days ?? 0} 日
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-2">
                      <div className="flex flex-col">
                        <span className="text-xs">
                          合計 {u.total_trades ?? 0} 回
                        </span>
                        <span className="text-[10px] text-slate-400">
                          トレード日数 {u.trading_days ?? 0} 日
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-2">
                      <div className="flex flex-col">
                        <span className="text-xs">
                          受講 {u.lectures_completed ?? 0}/
                          {u.lectures_accessed ?? 0} 講座
                        </span>
                        <span className="text-[10px] text-slate-400">
                          最終学習:{" "}
                          {u.last_learning_date
                            ? new Date(
                                u.last_learning_date
                              ).toLocaleDateString()
                            : "-"}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-2 text-[11px] text-slate-400">
                      {u.last_trade_date
                        ? new Date(u.last_trade_date).toLocaleString()
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
