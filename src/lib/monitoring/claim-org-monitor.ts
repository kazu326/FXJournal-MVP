/**
 * claim-org-access Edge Function 実行結果のトラッキング
 * 実行回数・成功/失敗率・レスポンス時間・エラー種別を集計（メモリ＋localStorage 永続化）
 * 将来的に Sentry / Datadog / Supabase Logs へ送信可能
 */

import type { ClaimOrgAccessResult } from "../supabase/claim-org-access";

const STORAGE_KEY = "fxj_claim_org_metrics";

export type ClaimOrgAccessMetrics = {
  totalCalls: number;
  successCount: number;
  failureCount: number;
  totalResponseTimeMs: number;
  errorsByCode: Record<string, number>;
  lastRunAt: string | null;
};

function getStored(): ClaimOrgAccessMetrics {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ClaimOrgAccessMetrics;
  } catch {
    // ignore
  }
  return {
    totalCalls: 0,
    successCount: 0,
    failureCount: 0,
    totalResponseTimeMs: 0,
    errorsByCode: {},
    lastRunAt: null,
  };
}

function setStored(m: ClaimOrgAccessMetrics) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
  } catch {
    // ignore
  }
}

let inMemory: ClaimOrgAccessMetrics = getStored();

export function getClaimOrgMetrics(): ClaimOrgAccessMetrics {
  return { ...inMemory };
}

export function recordClaimOrgAccess(
  result: ClaimOrgAccessResult,
  responseTimeMs: number
): void {
  inMemory.totalCalls += 1;
  inMemory.totalResponseTimeMs += responseTimeMs;
  inMemory.lastRunAt = new Date().toISOString();

  if (result.ok) {
    inMemory.successCount += 1;
  } else {
    inMemory.failureCount += 1;
    const code = result.code ?? "UNKNOWN";
    inMemory.errorsByCode[code] = (inMemory.errorsByCode[code] ?? 0) + 1;
  }

  setStored(inMemory);

  if (typeof window !== "undefined" && "console" in window && console.debug) {
    console.debug("[claim-org-access]", {
      ok: result.ok,
      responseTimeMs,
      totalCalls: inMemory.totalCalls,
      successRate:
        inMemory.totalCalls > 0
          ? ((inMemory.successCount / inMemory.totalCalls) * 100).toFixed(1) + "%"
          : "-",
    });
  }
}

export function resetClaimOrgMetrics(): void {
  inMemory = {
    totalCalls: 0,
    successCount: 0,
    failureCount: 0,
    totalResponseTimeMs: 0,
    errorsByCode: {},
    lastRunAt: null,
  };
  setStored(inMemory);
}
