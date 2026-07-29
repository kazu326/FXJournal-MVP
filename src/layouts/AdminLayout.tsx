import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { LayoutDashboard, Activity, ArrowLeft, BarChart3, Mail, Users, Menu, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

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
  {
    to: "/admin/settings",
    label: "システム設定",
    icon: Settings,
  },
  // 将来 `/admin/users` `/admin/trades` `/admin/learning` を追加予定
];


export default function AdminLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [adminCheckStatus, setAdminCheckStatus] = useState<"checking" | "authorized" | "unauthorized">("checking");
  const [adminCheckError, setAdminCheckError] = useState<string | null>(null);
  const [adminAccessScope, setAdminAccessScope] = useState<
    "full" | "messages-only" | null
  >(null);

  // 認証チェック完了後に未ログインならトップへ（loading 中はリダイレクトしない）
  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (loading) return;
    if (!user?.id) {
      return;
    }

    let cancelled = false;

    const verifyAdminAccess = async () => {
      setAdminCheckStatus("checking");
      setAdminCheckError(null);
      setAdminAccessScope(null);

      const isPlatformAdmin = await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (isPlatformAdmin.data?.user_id) {
        setAdminAccessScope("full");
        setAdminCheckStatus("authorized");
        return;
      }

      if (isPlatformAdmin.error && isPlatformAdmin.error.code !== "PGRST116") {
        console.warn("[admin-guard] platform_admins lookup failed", isPlatformAdmin.error);
      }

      const profileRole = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profileRole.error && profileRole.error.code !== "PGRST116") {
        console.warn("[admin-guard] profiles.role lookup failed", profileRole.error);
      }

      const role = profileRole.data?.role;
      if (role === "admin" || role === "platform_admin" || role === "teacher") {
        setAdminAccessScope("full");
        setAdminCheckStatus("authorized");
        return;
      }

      const organizationStaff = await supabase
        .from("org_staff")
        .select("staff_user_id, role")
        .eq("staff_user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (organizationStaff.data?.staff_user_id) {
        setAdminAccessScope("messages-only");
        setAdminCheckStatus(
          location.pathname.startsWith("/admin/messages")
            ? "authorized"
            : "unauthorized",
        );
        return;
      }

      if (
        organizationStaff.error &&
        organizationStaff.error.code !== "PGRST116"
      ) {
        console.warn(
          "[admin-guard] org_staff lookup failed",
          organizationStaff.error,
        );
        setAdminCheckError("管理画面のアクセス権限を確認できませんでした。");
      }

      setAdminCheckStatus("unauthorized");
    };

    void verifyAdminAccess();

    return () => {
      cancelled = true;
    };
  }, [user?.id, loading, location.pathname]);

  // 認証確認中はスピナー表示
  if (loading || (user && adminCheckStatus === "checking")) {
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

  if (adminCheckStatus === "unauthorized") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full border border-slate-800 bg-slate-900 p-6 rounded-lg space-y-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-50">管理画面へのアクセス権限がありません</h1>
            <p className="text-sm text-slate-400 mt-2">
              {adminAccessScope === "messages-only"
                ? "所属組織のスタッフは、相談対応と月次レビューのみ利用できます。"
                : "このページは platform admin、管理者、教師のみ利用できます。"}
            </p>
            {adminCheckError && (
              <p className="text-sm text-amber-300 mt-2">{adminCheckError}</p>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {adminAccessScope === "messages-only" && (
              <button
                type="button"
                onClick={() => navigate("/admin/messages", { replace: true })}
                className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                メッセージ管理へ
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate("/", { replace: true })}
              className="inline-flex items-center justify-center rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              ユーザー画面へ戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col md:flex-row">
      {/* モバイル用オーバーレイ */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* サイドバー */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-800 bg-slate-900/95 backdrop-blur-md 
          transition-transform duration-300 ease-in-out md:relative md:translate-x-0
          flex flex-col
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold">FX Journal</span>
              <span className="text-xs text-slate-400">Admin Dashboard</span>
            </div>
          </div>

        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems
            .filter(
              (item) =>
                adminAccessScope === "full" || item.to === "/admin/messages",
            )
            .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/admin"}
                onClick={() => setIsSidebarOpen(false)} // モバイルでクリック時に閉じる
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
      <main className="flex-1 flex flex-col min-h-screen">
        {/* モバイル用ヘッダー */}
        <header className="md:hidden px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 backdrop-blur sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={toggleSidebar} className="text-slate-300 hover:text-white">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold">Admin Dashboard</span>
              </div>
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

        <div className="flex-1 p-4 md:p-6 overflow-x-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
