import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import toast from "react-hot-toast";
import { invokeClaimOrgAccess } from "../lib/supabase/claim-org-access";
import { recordClaimOrgAccess } from "../lib/monitoring/claim-org-monitor";
import { supabase } from "../lib/supabase";

type AuthContextValue = {
  user: User | null;
  /** 初回の getSession が終わるまで true。この間は未ログイン判定をしない */
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
});

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const claimInvokedForUser = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ログイン後に1回だけ claim-org-access を呼ぶ（Owner/Staff の組織 claim）
  useEffect(() => {
    if (!user?.id) {
      claimInvokedForUser.current = null;
      return;
    }
    if (claimInvokedForUser.current === user.id) return;
    const storageKey = `org_claimed_${user.id}`;
    if (typeof localStorage !== "undefined" && localStorage.getItem(storageKey) === "true") {
      claimInvokedForUser.current = user.id;
      return;
    }
    claimInvokedForUser.current = user.id;

    void (async () => {
      const start = Date.now();
      const result = await invokeClaimOrgAccess();
      const responseTimeMs = Date.now() - start;
      recordClaimOrgAccess(result, responseTimeMs);

      // 通知購読の自動更新（許可済みの場合、DBをクリアした後の復旧用）
      if (user?.id && "Notification" in window && Notification.permission === "granted") {
        import("../lib/push").then(({ subscribeToPush }) => {
          subscribeToPush(user.id).catch(err => console.error("Auto-push sync failed:", err));
        });
      }

      if (result.ok) {
        if (typeof localStorage !== "undefined") localStorage.setItem(storageKey, "true");
        if (result.created_org || result.staff_added) {
          toast.success("組織権限を取得しました", { duration: 3000 });
        }
      } else {
        if (result.code === "UNAUTHORIZED") {
          console.warn("[claim-org-access] セッション切れ。再ログインしてください。", result.message);
        } else if (result.code === "BAD_REQUEST") {
          // discord_id がない場合などは、開発環境では info レベルにする（警告をうるさくしない）
          if (result.message?.includes("discord_id not found") || result.message?.includes("not found")) {
            console.info("[claim-org-access] 組織権限の自動取得はスキップされました（開発用ユーザー）: ", result.message);
          } else {
            console.warn("[claim-org-access] データ不整合:", result.message);
          }
        } else {
          console.warn("[claim-org-access] 失敗（非ブロッキング）:", result.message, result.code);
        }
      }
    })();
  }, [user?.id]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
