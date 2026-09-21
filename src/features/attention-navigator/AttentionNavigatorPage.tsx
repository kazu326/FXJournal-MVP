import { useState } from "react";
import type { CurrencyPair } from "../../services/currencyPairService";
import { AttentionGate } from "./AttentionGate";
import {
  createAttentionSession,
  finishAttentionSession,
  startJevQ1Q2Evaluation,
} from "./api";
import { JudgmentNavigator } from "./JudgmentNavigator";
import {
  ATTENTION_HTF,
  CHART_TIMEFRAMES,
  GATE_QUESTIONS,
  JUDGMENT_QUESTIONS,
} from "./questions";
import { SessionResult } from "./SessionResult";
import {
  answersElapsedSeconds,
  elapsedSeconds,
  isHardVeto,
  nextJudgmentIndex,
  resolveGateTransition,
} from "./state-machine";
import { useAttentionNavigatorStore } from "./store";
import type {
  AttentionAnswer,
  AttentionAnswerRecord,
  FinalDecision,
} from "./types";

type AttentionNavigatorPageProps = {
  userId: string;
  currencyPairs: CurrencyPair[];
  onBack: () => void;
  onStartTrade: (pair: CurrencyPair, sessionId: string) => void;
};

export function AttentionNavigatorPage({
  userId,
  currencyPairs,
  onBack,
  onStartTrade,
}: AttentionNavigatorPageProps) {
  const [setupPairId, setSetupPairId] = useState("");
  const [setupChartTf, setSetupChartTf] = useState<string>("M15");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const {
    phase,
    pair,
    htf,
    chartTf,
    startedAt,
    questionStartedAt,
    gateCompletedAt,
    gateIndex,
    judgmentIndex,
    gateAnswers,
    judgmentAnswers,
    gateResult,
    hardVeto,
    finalDecision,
    sessionId,
    startSession,
    addGateAnswer,
    addJudgmentAnswer,
    setGateIndex,
    setJudgmentIndex,
    completeGate,
    startJudgment,
    startDecision,
    setSessionId,
    setPhase,
    completeDecision,
    resetWizard,
  } = useAttentionNavigatorStore();

  const selectedSetupPair = currencyPairs.find(
    (candidate) => candidate.id === setupPairId,
  );

  const makeAnswerRecord = (
    id: AttentionAnswerRecord["id"],
    answer: AttentionAnswer,
    now: string,
  ): AttentionAnswerRecord => ({
    id,
    answer,
    reason: reason.trim(),
    elapsed_ms: Math.max(
      0,
      new Date(now).getTime() -
        new Date(questionStartedAt ?? now).getTime(),
    ),
  });

  const handleStart = () => {
    if (!selectedSetupPair) {
      setError("通貨ペアを選択してください。");
      return;
    }
    const now = new Date().toISOString();
    setError("");
    setReason("");
    startSession({
      pair: { id: selectedSetupPair.id, symbol: selectedSetupPair.symbol },
      chartTf: setupChartTf,
      now,
    });
  };

  const handleGateAnswer = async (answer: AttentionAnswer) => {
    if (saving || !pair || !startedAt) return;
    const question = GATE_QUESTIONS[gateIndex];
    if (!question) return;

    const now = new Date().toISOString();
    const answerRecord = makeAnswerRecord(question.id, answer, now);
    const transition = resolveGateTransition(question.id, answer);

    if (transition.kind === "next") {
      addGateAnswer(answerRecord);
      setGateIndex(transition.nextIndex, now);
      setReason("");
      setError("");
      return;
    }

    setSaving(true);
    setError("");
    const nextGateAnswers = [...gateAnswers, answerRecord];
    try {
      const isFinished = transition.result !== "pass";
      const createdSessionId = await createAttentionSession({
        userId,
        currencyPairId: pair.id,
        symbol: pair.symbol,
        htf,
        chartTf,
        startedAt,
        finishedAt: isFinished ? now : null,
        gateResult: transition.result,
        gateAnswers: nextGateAnswers,
        gateSeconds: elapsedSeconds(startedAt, now),
        totalSeconds: isFinished ? elapsedSeconds(startedAt, now) : null,
      });

      try {
        startJevQ1Q2Evaluation(createdSessionId);
      } catch {
        // The comparison experiment must never alter the established Gate flow.
      }

      addGateAnswer(answerRecord);
      completeGate(transition.result, now);
      setSessionId(createdSessionId);
      setReason("");
      if (transition.result === "pass") {
        startJudgment(new Date().toISOString());
      } else {
        setPhase("result");
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Attentionセッションを保存できませんでした。",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleJudgmentAnswer = (answer: AttentionAnswer) => {
    if (saving) return;
    const question = JUDGMENT_QUESTIONS[judgmentIndex];
    if (!question) return;

    const now = new Date().toISOString();
    const answerRecord = makeAnswerRecord(question.id, answer, now);
    const vetoed = isHardVeto(question.id, answer);
    const nextIndex = nextJudgmentIndex(question.id);

    addJudgmentAnswer(answerRecord);
    setReason("");
    setError("");

    if (vetoed || nextIndex === null) {
      startDecision(vetoed);
      return;
    }
    setJudgmentIndex(nextIndex, now);
  };

  const handleDecision = async (decision: FinalDecision) => {
    if (
      saving ||
      !sessionId ||
      !startedAt ||
      !gateCompletedAt ||
      !pair ||
      (hardVeto && decision === "consider_trade")
    ) {
      return;
    }

    const selectedTradePair =
      decision === "consider_trade"
        ? currencyPairs.find((candidate) => candidate.id === pair.id)
        : null;
    if (decision === "consider_trade" && !selectedTradePair) {
      setError("選択した通貨ペアを取得できませんでした。");
      return;
    }

    const finishedAt = new Date().toISOString();
    setSaving(true);
    setError("");
    try {
      await finishAttentionSession({
        sessionId,
        userId,
        finishedAt,
        finalDecision: decision,
        judgmentAnswers,
        hardVeto,
        judgmentSeconds: answersElapsedSeconds(judgmentAnswers),
        totalSeconds: elapsedSeconds(startedAt, finishedAt),
      });

      if (decision === "consider_trade" && selectedTradePair) {
        resetWizard();
        onStartTrade(selectedTradePair, sessionId);
        return;
      }

      completeDecision(decision);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "最終判断を保存できませんでした。",
      );
    } finally {
      setSaving(false);
    }
  };

  const leaveCompletedSession = () => {
    resetWizard();
    onBack();
  };

  const restart = () => {
    resetWizard();
    setReason("");
    setError("");
  };

  const handleBack = () => {
    if (phase === "result") {
      resetWizard();
    }
    onBack();
  };

  return (
    <section
      className="mx-auto max-w-md space-y-4 pb-4"
      data-testid="attention-navigator"
    >
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={handleBack}
          className="min-h-11 rounded-lg px-2 text-sm font-semibold text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          ← 戻る
        </button>
        <div className="text-center">
          <h1 className="m-0 text-lg font-bold">Attention Navigator</h1>
          <p className="m-0 text-xs text-zinc-500">判断前の30秒チェック</p>
        </div>
        <div className="min-w-16" aria-hidden />
      </div>

      {error ? (
        <div
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {phase === "setup" ? (
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-wide text-violet-600">
              Setup
            </p>
            <h2 className="m-0 mt-2 text-xl font-black text-zinc-900">
              確認する相場を選択
            </h2>
            <p className="m-0 mt-2 text-sm leading-relaxed text-zinc-600">
              エントリー推奨ではなく、今この相場に注意を向ける価値があるかを整理します。
            </p>
          </div>

          <label className="block text-sm font-semibold text-zinc-700">
            通貨ペア
            <select
              aria-label="Attention 通貨ペア"
              value={setupPairId}
              onChange={(event) => setSetupPairId(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-3 text-base font-semibold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">選択してください</option>
              {currencyPairs.map((currencyPair) => (
                <option key={currencyPair.id} value={currencyPair.id}>
                  {currencyPair.symbol}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-semibold text-zinc-700">
              HTF
              <input
                value={ATTENTION_HTF}
                readOnly
                aria-label="HTF"
                className="mt-2 min-h-12 w-full rounded-xl border border-zinc-200 bg-zinc-100 px-3 font-bold text-zinc-700"
              />
            </label>
            <label className="block text-sm font-semibold text-zinc-700">
              判断足
              <select
                aria-label="判断足"
                value={setupChartTf}
                onChange={(event) => setSetupChartTf(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-3 font-bold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {CHART_TIMEFRAMES.map((timeframe) => (
                  <option key={timeframe} value={timeframe}>
                    {timeframe}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            data-testid="attention-setup-start"
            onClick={handleStart}
            className="btn-cta min-h-14 w-full rounded-xl px-4 text-sm font-bold"
          >
            Gateを始める
          </button>
        </div>
      ) : null}

      {phase === "gate" ? (
        <AttentionGate
          questionIndex={gateIndex}
          reason={reason}
          disabled={saving}
          onReasonChange={setReason}
          onAnswer={(answer) => void handleGateAnswer(answer)}
        />
      ) : null}

      {phase === "judgment" ? (
        <JudgmentNavigator
          questionIndex={judgmentIndex}
          reason={reason}
          disabled={saving}
          onReasonChange={setReason}
          onAnswer={handleJudgmentAnswer}
        />
      ) : null}

      {(phase === "decision" || phase === "result") && gateResult ? (
        <SessionResult
          gateResult={gateResult}
          hardVeto={hardVeto}
          finalDecision={finalDecision}
          selectingDecision={phase === "decision"}
          saving={saving}
          onDecision={(decision) => void handleDecision(decision)}
          onHome={leaveCompletedSession}
          onRestart={restart}
        />
      ) : null}
    </section>
  );
}
