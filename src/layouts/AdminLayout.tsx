import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Activity, ArrowLeft, BarChart3, Mail, Users } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

const navItems = [
  {
    to: "/admin",
    label: "概要",
    icon: LayoutDashboard,
  },
  {
    to: "/admin/behavior",
    label: "行動変容",
    icon: Activity,
  },
  {
    to: "/admin/messages",
    label: "メッセージ",
    icon: Mail,
  },
  {
    to: "/admin/interventions",
    label: "施策管理",
    icon: Users,
  },
  // 将来 `/admin/users` `/admin/trades` `/admin/learning` を追加予定
];


export default function AdminLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // 認証チェック完了後に未ログインならトップへ（loading 中はリダイレクトしない）
  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  // 認証確認中はスピナー表示
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-600 border-t-emerald-400" />
      </div>
    );
  }

  // 未ログインなら何も描画せず（useEffect でリダイレクトする）
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex">
      {/* サイドバー */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/60 backdrop-blur-md hidden md:flex md:flex-col">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">FX Journal</span>
            <span className="text-xs text-slate-400">Admin Dashboard</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/admin"}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                      : "text-slate-300 hover:bg-slate-800 hover:text-slate-50",
                  ].join(" ")
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-slate-800">
          <Link
            to="/"
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ユーザー画面に戻る</span>
          </Link>
        </div>
      </aside>

      {/* メイン */}
      <main className="flex-1 flex flex-col">
        {/* モバイル用ヘッダー */}
        <header className="md:hidden px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Admin Dashboard</span>
              <span className="text-xs text-slate-400">FX Journal</span>
            </div>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>戻る</span>
          </Link>
        </header>

        <div className="flex-1 p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
