import React from "react";
import { Menu, Home, FileText, Users, LogOut } from "lucide-react";

type AdminHeaderProps = {
  title: string;
  staffName: string;
  logsLabel?: string;
  showMenu: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onGoTeacherHome: () => void;
  onGoLogs: () => void;
  onGoUserView: () => void;
  onLogout: () => void;
};

export function AdminHeader({
  title,
  staffName,
  logsLabel = "ログ閲覧",
  showMenu,
  onToggleMenu,
  onCloseMenu,
  onGoTeacherHome,
  onGoLogs,
  onGoUserView,
  onLogout,
}: AdminHeaderProps) {
  const btn =
    "inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50 active:bg-zinc-100 transition-colors";

  return (
    <header className="sticky top-0 z-10 -mx-4 px-4 pt-4 pb-3 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {/* 1段目：固定行（折り返し禁止） */}
        <div className="flex items-center gap-3 p-4">
          <div className="min-w-0">
            <div className="truncate text-lg font-bold text-zinc-900">{title}</div>
            <div className="truncate text-sm text-zinc-600">Staff: {staffName}</div>
          </div>

          <button
            type="button"
            onClick={onToggleMenu}
            className="ml-auto flex-shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
            aria-label="メニュー"
            aria-expanded={showMenu}
            aria-controls="adminMenu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* 2段目：md以上で表示 */}
        <div className="hidden md:flex flex-nowrap gap-2 px-4 pb-4 overflow-x-auto">
          <button type="button" className={btn} onClick={onGoTeacherHome}>
            <Home className="h-4 w-4" />
            先生ホーム
          </button>

          <button type="button" className={btn} onClick={onGoLogs}>
            <FileText className="h-4 w-4" />
            {logsLabel}
          </button>

          <button type="button" className={btn} onClick={onGoUserView}>
            <Users className="h-4 w-4" />
            ユーザー画面
          </button>

          <button type="button" className={btn} onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            ログアウト
          </button>
        </div>
      </div>

      {/* md未満：オーバーレイ（外側タップで閉じる）＋簡易メニュー（縦並び） */}
      <div className="md:hidden">
        {showMenu ? (
          <button
            type="button"
            className="fixed inset-0 z-0 cursor-default bg-black/10"
            aria-label="閉じる"
            onClick={onCloseMenu}
          />
        ) : null}
        <div className="relative z-10" id="adminMenu">
          {showMenu ? (
            <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
              <div className="flex flex-col gap-2">
                <button type="button" className={btn} onClick={() => (onCloseMenu(), onGoTeacherHome())}>
                  <Home className="h-4 w-4" />
                  先生ホーム
                </button>

                <button type="button" className={btn} onClick={() => (onCloseMenu(), onGoLogs())}>
                  <FileText className="h-4 w-4" />
                  {logsLabel}
                </button>

                <button type="button" className={btn} onClick={() => (onCloseMenu(), onGoUserView())}>
                  <Users className="h-4 w-4" />
                  ユーザー画面
                </button>

                <button type="button" className={btn} onClick={() => (onCloseMenu(), onLogout())}>
                  <LogOut className="h-4 w-4" />
                  ログアウト
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default AdminHeader;
