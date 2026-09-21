import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  AttentionAnswerRecord,
  AttentionPair,
  AttentionPhase,
  FinalDecision,
  GateResult,
} from "./types";

type StartSessionInput = {
  pair: AttentionPair;
  chartTf: string;
  now: string;
};

type AttentionNavigatorState = {
  phase: AttentionPhase;
  pair: AttentionPair | null;
  htf: "H4";
  chartTf: string;
  startedAt: string | null;
  questionStartedAt: string | null;
  gateCompletedAt: string | null;
  gateIndex: number;
  judgmentIndex: number;
  gateAnswers: AttentionAnswerRecord[];
  judgmentAnswers: AttentionAnswerRecord[];
  gateResult: GateResult | null;
  hardVeto: boolean;
  finalDecision: FinalDecision | null;
  sessionId: string | null;
  pendingTradeSessionId: string | null;
  startSession: (input: StartSessionInput) => void;
  addGateAnswer: (answer: AttentionAnswerRecord) => void;
  addJudgmentAnswer: (answer: AttentionAnswerRecord) => void;
  setGateIndex: (index: number, now: string) => void;
  setJudgmentIndex: (index: number, now: string) => void;
  completeGate: (result: GateResult, now: string) => void;
  startJudgment: (now: string) => void;
  startDecision: (hardVeto: boolean) => void;
  setSessionId: (sessionId: string) => void;
  setPhase: (phase: AttentionPhase) => void;
  completeDecision: (decision: FinalDecision) => void;
  setPendingTradeSessionId: (sessionId: string | null) => void;
  resetWizard: () => void;
};

const initialWizardState = {
  phase: "setup" as AttentionPhase,
  pair: null as AttentionPair | null,
  htf: "H4" as const,
  chartTf: "",
  startedAt: null as string | null,
  questionStartedAt: null as string | null,
  gateCompletedAt: null as string | null,
  gateIndex: 0,
  judgmentIndex: 0,
  gateAnswers: [] as AttentionAnswerRecord[],
  judgmentAnswers: [] as AttentionAnswerRecord[],
  gateResult: null as GateResult | null,
  hardVeto: false,
  finalDecision: null as FinalDecision | null,
  sessionId: null as string | null,
};

export const useAttentionNavigatorStore = create<AttentionNavigatorState>()(
  persist(
    (set) => ({
      ...initialWizardState,
      pendingTradeSessionId: null,
      startSession: ({ pair, chartTf, now }) =>
        set({
          ...initialWizardState,
          phase: "gate",
          pair,
          chartTf,
          startedAt: now,
          questionStartedAt: now,
        }),
      addGateAnswer: (answer) =>
        set((state) => ({ gateAnswers: [...state.gateAnswers, answer] })),
      addJudgmentAnswer: (answer) =>
        set((state) => ({ judgmentAnswers: [...state.judgmentAnswers, answer] })),
      setGateIndex: (gateIndex, now) =>
        set({ gateIndex, questionStartedAt: now }),
      setJudgmentIndex: (judgmentIndex, now) =>
        set({ judgmentIndex, questionStartedAt: now }),
      completeGate: (gateResult, now) =>
        set({ gateResult, gateCompletedAt: now, questionStartedAt: null }),
      startJudgment: (now) =>
        set({ phase: "judgment", judgmentIndex: 0, questionStartedAt: now }),
      startDecision: (hardVeto) =>
        set({ phase: "decision", hardVeto, questionStartedAt: null }),
      setSessionId: (sessionId) => set({ sessionId }),
      setPhase: (phase) => set({ phase }),
      completeDecision: (finalDecision) =>
        set({ phase: "result", finalDecision }),
      setPendingTradeSessionId: (pendingTradeSessionId) =>
        set({ pendingTradeSessionId }),
      resetWizard: () => set(initialWizardState),
    }),
    {
      name: "fxj-attention-navigator",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
