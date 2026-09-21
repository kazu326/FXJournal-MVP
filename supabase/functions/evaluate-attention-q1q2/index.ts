import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  FEATURE_VERSION,
  JEV_MODEL,
  JEV_SCOPE,
  MINIMUM_H4_BARS,
  PROMPT_VERSION,
} from "./constants.ts";
import { compareHumanAndJev } from "./comparison.ts";
import { buildQ1TrendFeatures } from "./features/q1TrendFeatures.ts";
import {
  buildQ2MarketEnvironmentFeatures,
  type AssetMarketSeries,
  type YieldMarketSeries,
} from "./features/q2MarketEnvironmentFeatures.ts";
import { decideRunAction } from "./idempotency.ts";
import { validateQ1Output, validateQ2Output } from "./outputValidation.ts";
import { UnavailableJevProvider } from "./providers/jevProvider.ts";
import { UnavailableMacroEventProvider } from "./providers/macroEventProvider.ts";
import { UnavailableMarketDataProvider } from "./providers/marketDataProvider.ts";
import { ExperimentError, type AssetKey, type JevAnswer, type OhlcBar } from "./types.ts";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type GateAnswerRecord = { id?: unknown; answer?: unknown };

function humanAnswer(records: unknown, id: string): JevAnswer | null {
  if (!Array.isArray(records)) return null;
  const found = (records as GateAnswerRecord[]).find((record) => record?.id === id);
  return found?.answer === "yes" || found?.answer === "no" || found?.answer === "unknown"
    ? found.answer
    : null;
}

function barsToAssetSeries(bars: OhlcBar[]): AssetMarketSeries | null {
  if (bars.length < 5) return null;
  const ordered = [...bars].sort((a, b) => a.time.localeCompare(b.time));
  const currentIndex = ordered.length - 1;
  const baselineReturns: number[] = [];
  for (let index = 1; index < currentIndex; index += 1) {
    const previous = ordered[index - 1].close;
    if (Number.isFinite(previous) && previous !== 0 && Number.isFinite(ordered[index].close)) {
      baselineReturns.push(Math.abs(((ordered[index].close - previous) / previous) * 100));
    }
  }
  const days = new Set(ordered.slice(0, currentIndex).map((bar) => bar.time.slice(0, 10))).size;
  return {
    current: ordered[currentIndex].close,
    oneHourAgo: ordered[currentIndex - 1].close,
    fourHoursAgo: ordered[currentIndex - 4].close,
    baselineAbsolute1hReturns: baselineReturns,
    baselineTradingDays: days,
  };
}

function barsToYieldSeries(bars: OhlcBar[]): YieldMarketSeries | null {
  if (bars.length < 2) return null;
  const ordered = [...bars].sort((a, b) => a.time.localeCompare(b.time));
  return {
    currentPercent: ordered[ordered.length - 1].close,
    oneHourAgoPercent: ordered[ordered.length - 2].close,
  };
}

function safeError(error: unknown): { code: string; message: string } {
  if (error instanceof ExperimentError) return { code: error.code, message: error.message };
  return { code: "EXPERIMENT_INTERNAL_ERROR", message: "The experimental evaluation failed." };
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "UNAUTHORIZED" }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "INVALID_REQUEST" }, 400);
  }
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    typeof (body as Record<string, unknown>).attentionSessionId !== "string" ||
    Object.keys(body as Record<string, unknown>).some((key) => key !== "attentionSessionId")
  ) {
    return json({ error: "INVALID_REQUEST" }, 400);
  }
  const attentionSessionId = (body as { attentionSessionId: string }).attentionSessionId;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "SERVER_UNCONFIGURED" }, 500);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userResult, error: userError } = await userClient.auth.getUser();
  if (userError || !userResult.user) return json({ error: "UNAUTHORIZED" }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: session, error: sessionError } = await admin
    .from("attention_sessions")
    .select("id,user_id,symbol,started_at,gate_answers")
    .eq("id", attentionSessionId)
    .maybeSingle();
  if (sessionError || !session) return json({ error: "SESSION_NOT_FOUND" }, 404);
  if (session.user_id !== userResult.user.id) return json({ error: "FORBIDDEN" }, 403);

  const { data: existing } = await admin
    .from("jev_runs")
    .select("id,status")
    .eq("attention_session_id", attentionSessionId)
    .maybeSingle();
  if (decideRunAction(existing ? { status: existing.status } : null) === "skip") {
    return json({ accepted: true, duplicate: true }, 202);
  }

  const { data: created, error: createError } = await admin
    .from("jev_runs")
    .insert({
      attention_session_id: attentionSessionId,
      user_id: userResult.user.id,
      scope: JEV_SCOPE,
      model: JEV_MODEL,
      prompt_version: PROMPT_VERSION,
      feature_version: FEATURE_VERSION,
      status: "pending",
      snapshot_at: session.started_at,
    })
    .select("id")
    .single();
  if (createError?.code === "23505") return json({ accepted: true, duplicate: true }, 202);
  if (createError || !created) return json({ error: "RUN_CREATE_FAILED" }, 500);

  const runId = created.id;
  const startedMs = Date.now();
  await admin.from("jev_runs").update({ status: "running" }).eq("id", runId);

  try {
    // No external service is guessed in v0.1. Replace these unavailable adapters
    // only after the provider ticker mapping and auth contracts are supplied.
    const marketProvider = new UnavailableMarketDataProvider();
    const macroProvider = new UnavailableMacroEventProvider();
    const jevProvider = new UnavailableJevProvider();

    const h4Bars = await marketProvider.getBars({
      asset: { sessionSymbol: session.symbol },
      timeframe: "H4",
      limit: MINIMUM_H4_BARS,
      endAt: session.started_at,
      confirmedOnly: true,
    });
    const q1Input = buildQ1TrendFeatures(session.symbol, h4Bars);

    const assetKeys: AssetKey[] = ["gold", "usTech", "sp500", "btc", "dxy", "us10y"];
    const series = new Map<AssetKey, OhlcBar[] | null>();
    await Promise.all(
      assetKeys.map(async (asset) => {
        try {
          series.set(
            asset,
            await marketProvider.getBars({
              asset,
              timeframe: "H1",
              limit: 24 * 21 + 5,
              endAt: session.started_at,
              confirmedOnly: true,
            }),
          );
        } catch {
          series.set(asset, null);
        }
      }),
    );
    let macroEvent;
    try {
      macroEvent = await macroProvider.getNearestHighImpactUsdEvent(session.started_at);
    } catch {
      macroEvent = { available: false } as const;
    }
    const q2Input = buildQ2MarketEnvironmentFeatures({
      snapshotAt: session.started_at,
      gold: barsToAssetSeries(series.get("gold") ?? []),
      usTech: barsToAssetSeries(series.get("usTech") ?? []),
      sp500: barsToAssetSeries(series.get("sp500") ?? []),
      btc: barsToAssetSeries(series.get("btc") ?? []),
      dxy: barsToAssetSeries(series.get("dxy") ?? []),
      us10y: barsToYieldSeries(series.get("us10y") ?? []),
      macroEvent,
    });

    await admin.from("jev_runs").update({ q1_input: q1Input, q2_input: q2Input }).eq("id", runId);

    // Jev receives only q1Input/q2Input. Human answers remain outside this call.
    const [rawQ1Output, rawQ2Output] = await Promise.all([
      jevProvider.evaluateQ1(q1Input),
      jevProvider.evaluateQ2(q2Input),
    ]);
    const q1Output = validateQ1Output(rawQ1Output);
    const q2Output = validateQ2Output(rawQ2Output);

    // Human answers are read only after Jev has completed, then compared locally.
    const humanQ1 = humanAnswer(session.gate_answers, "playbook_target");
    const humanQ2 = humanAnswer(session.gate_answers, "market_environment");
    await admin
      .from("jev_runs")
      .update({
        status: "completed",
        q1_output: q1Output,
        q2_output: q2Output,
        q1_comparison: compareHumanAndJev(humanQ1, q1Output.answer),
        q2_comparison: compareHumanAndJev(humanQ2, q2Output.answer),
        latency_ms: Date.now() - startedMs,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);
    return json({ accepted: true }, 202);
  } catch (error) {
    const safe = safeError(error);
    await admin
      .from("jev_runs")
      .update({
        status: "failed",
        latency_ms: Date.now() - startedMs,
        error_code: safe.code,
        error_message: safe.message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);
    return json({ accepted: true }, 202);
  }
});
