/**
 * pending_org_owners / pending_org_staff から組織権限を自動取得する Edge Function 呼び出し
 * Discord OAuth 後、初回ログイン時に1度だけ実行する想定（冪等）
 */

import { supabase } from ".";

const CLAIM_ORG_ACCESS_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/** 成功時のレスポンス（Edge Function の ClaimResult に準拠） */
export type ClaimOrgAccessSuccess = {
  ok: true;
  created_org?: boolean;
  staff_added?: boolean;
  pending_owner?: boolean;
  pending_staff?: boolean;
  message?: string;
  org_id?: string;
  role?: string;
};

/** エラー時のレスポンス */
export type ClaimOrgAccessError = {
  ok: false;
  message: string;
  status?: number;
  code?: "UNAUTHORIZED" | "BAD_REQUEST" | "SERVER_ERROR" | "TIMEOUT" | "NETWORK";
};

export type ClaimOrgAccessResult = ClaimOrgAccessSuccess | ClaimOrgAccessError;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * claim-org-access Edge Function を呼び出す（リトライ・タイムアウト付き）
 */
export async function invokeClaimOrgAccess(): Promise<ClaimOrgAccessResult> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claim-org-access`;
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    return {
      ok: false,
      message: "No session",
      code: "UNAUTHORIZED",
    };
  }

  let lastError: ClaimOrgAccessError | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CLAIM_ORG_ACCESS_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const body = (await res.json().catch(() => ({}))) as ClaimOrgAccessResult | { message?: string };

      if (!res.ok) {
        const err: ClaimOrgAccessError = {
          ok: false,
          message: (body && "message" in body ? body.message : res.statusText) || "Unknown error",
          status: res.status,
          code:
            res.status === 401
              ? "UNAUTHORIZED"
              : res.status === 400
                ? "BAD_REQUEST"
                : "SERVER_ERROR",
        };
        lastError = err;
        if (res.status === 401) return err;
        if (res.status === 400) return err;
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        return err;
      }

      const result = body as ClaimOrgAccessSuccess;
      result.ok = true;
      return result;
    } catch (e) {
      clearTimeout(timeoutId);
      const isTimeout = e instanceof Error && e.name === "AbortError";
      lastError = {
        ok: false,
        message: isTimeout ? "Request timeout" : (e instanceof Error ? e.message : "Network error"),
        code: isTimeout ? "TIMEOUT" : "NETWORK",
      };
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      return lastError;
    }
  }

  return lastError ?? { ok: false, message: "Unknown error", code: "NETWORK" };
}
