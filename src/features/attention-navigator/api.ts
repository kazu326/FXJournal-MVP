import { supabase } from "../../lib/supabase";
import type {
  AttentionAnswerRecord,
  FinalDecision,
  GateResult,
} from "./types";

type CreateAttentionSessionInput = {
  userId: string;
  currencyPairId: string;
  symbol: string;
  htf: string;
  chartTf: string;
  startedAt: string;
  finishedAt: string | null;
  gateResult: GateResult;
  gateAnswers: AttentionAnswerRecord[];
  gateSeconds: number;
  totalSeconds: number | null;
};

type FinishAttentionSessionInput = {
  sessionId: string;
  userId: string;
  finishedAt: string;
  finalDecision: FinalDecision;
  judgmentAnswers: AttentionAnswerRecord[];
  hardVeto: boolean;
  judgmentSeconds: number;
  totalSeconds: number;
};

export async function createAttentionSession(
  input: CreateAttentionSessionInput,
) {
  const { data, error } = await supabase
    .from("attention_sessions")
    .insert([
      {
        user_id: input.userId,
        currency_pair_id: input.currencyPairId,
        symbol: input.symbol,
        htf: input.htf,
        chart_tf: input.chartTf,
        started_at: input.startedAt,
        finished_at: input.finishedAt,
        gate_result: input.gateResult,
        gate_answers: input.gateAnswers,
        judgment_answers: [],
        hard_veto: false,
        gate_seconds: input.gateSeconds,
        total_seconds: input.totalSeconds,
      },
    ])
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "Attentionセッションを保存できませんでした。");
  }

  return data.id as string;
}

export async function finishAttentionSession(
  input: FinishAttentionSessionInput,
) {
  const { data, error } = await supabase
    .from("attention_sessions")
    .update({
      finished_at: input.finishedAt,
      final_decision: input.finalDecision,
      judgment_answers: input.judgmentAnswers,
      hard_veto: input.hardVeto,
      judgment_seconds: input.judgmentSeconds,
      total_seconds: input.totalSeconds,
    })
    .eq("id", input.sessionId)
    .eq("user_id", input.userId)
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "最終判断を保存できませんでした。");
  }
}

export async function linkAttentionSessionToTradeLog(
  sessionId: string,
  userId: string,
  tradeLogId: string,
) {
  const { data, error } = await supabase
    .from("attention_sessions")
    .update({ trade_log_id: tradeLogId })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .is("trade_log_id", null)
    .select("id")
    .maybeSingle();

  if (error || !data?.id) {
    throw new Error(
      error?.message ?? "Attentionセッションと取引記録を関連付けできませんでした。",
    );
  }
}

