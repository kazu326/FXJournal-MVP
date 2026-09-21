import type { FinalDecision, GateResult } from "./types";

type SessionResultProps = {
  gateResult: GateResult;
  hardVeto: boolean;
  finalDecision: FinalDecision | null;
  selectingDecision: boolean;
  saving: boolean;
  onDecision: (decision: FinalDecision) => void;
  onHome: () => void;
  onRestart: () => void;
};

const RESULT_COPY: Record<Exclude<GateResult, "pass">, { title: string; body: string }> = {
  stop: {
    title: "STOP",
    body: "今は通常の判断を続けない条件です。相場から離れるか、別の候補を確認しましょう。",
  },
  hold: {
    title: "HOLD",
    body: "条件がまだ揃っていません。認知資源を使い続けず、次の確認タイミングまで待ちましょう。",
  },
};

export function SessionResult({
  gateResult,
  hardVeto,
  finalDecision,
  selectingDecision,
  saving,
  onDecision,
  onHome,
  onRestart,
}: SessionResultProps) {
  if (selectingDecision) {
    return (
      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div>
          <p className="m-0 text-xs font-bold uppercase tracking-wide text-blue-600">
            Human decision
          </p>
          <h2 className="m-0 mt-2 text-xl font-black text-zinc-900">
            最終判断を選んでください
          </h2>
          <p className="m-0 mt-2 text-sm leading-relaxed text-zinc-600">
            {hardVeto
              ? "Hard vetoが発生したため、トレード検討には進めません。"
              : "Navigatorは順番を提供するだけです。最後は自分で判断します。"}
          </p>
        </div>
        {hardVeto ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800" role="alert">
            Hard veto STOP
          </div>
        ) : null}
        <div className="space-y-2">
          <button
            type="button"
            data-testid="attention-decision-skip"
            disabled={saving}
            onClick={() => onDecision("skip")}
            className="min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm font-bold text-zinc-800 disabled:opacity-50"
          >
            見送り
          </button>
          <button
            type="button"
            data-testid="attention-decision-monitor"
            disabled={saving}
            onClick={() => onDecision("monitor")}
            className="min-h-12 w-full rounded-xl border border-blue-300 bg-blue-50 px-4 text-sm font-bold text-blue-800 disabled:opacity-50"
          >
            継続監視
          </button>
          <button
            type="button"
            data-testid="attention-decision-trade"
            disabled={saving || hardVeto}
            onClick={() => onDecision("consider_trade")}
            className="btn-cta min-h-12 w-full rounded-xl px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
          >
            トレード検討（既存4-Gateへ）
          </button>
        </div>
      </div>
    );
  }

  const terminal = gateResult === "pass" ? null : RESULT_COPY[gateResult];
  const title = hardVeto ? "STOP" : terminal?.title ?? "記録完了";
  const body = hardVeto
    ? "Hard vetoにより本判断を終了しました。トレード検討には進みません。"
    : terminal?.body ??
      (finalDecision === "monitor"
        ? "継続監視として記録しました。"
        : "見送りとして記録しました。");

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 text-center shadow-sm" data-testid="attention-result">
      <p className="m-0 text-3xl font-black text-zinc-900">{title}</p>
      <p className="m-0 text-sm leading-relaxed text-zinc-600">{body}</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onHome}
          className="min-h-12 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-bold text-zinc-700"
        >
          ホームへ
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="min-h-12 rounded-xl border border-blue-300 bg-blue-50 px-3 text-sm font-bold text-blue-800"
        >
          新しく始める
        </button>
      </div>
    </div>
  );
}
