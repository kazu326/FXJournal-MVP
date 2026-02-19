import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// === 型定義 ===
export type TradeStatus = 'idle' | 'pre-entry' | 'active' | 'post-entry';
export type SuccessProb = 'high' | 'mid' | 'low';
export type ExpectedValue = 'plus' | 'minus' | 'unknown';

export interface GateState {
    gate_trade_count_ok: boolean;
    gate_rr_ok: boolean;
    gate_risk_ok: boolean;
    gate_rule_ok: boolean;
}

export interface TradeLogLite {
    id: string;
    occurred_at: string;
    log_type: 'valid' | 'invalid' | 'skip';
    gate_all_ok: boolean;
    success_prob: SuccessProb | null;
    expected_value: ExpectedValue | null;
    post_gate_kept: boolean | null;
    post_within_hypothesis: boolean | null;
    unexpected_reason: string | null;
    voided_at?: string | null;
    completed_at?: string | null;
}

// === ストアの状態インターフェース ===
interface TradeState {
    // mode は URL パスで管理（ストアでは不要）

    // === Pre-Trade（取引前入力） ===
    gate: GateState;
    note: string;
    successProb: SuccessProb;
    expectedValue: ExpectedValue;
    accountBalance: string;
    stopLossAmount: string;
    takeProfitAmount: string;
    // Phase 3: 通貨ペア・ピップス入力
    selectedPairSymbol: string;   // 選択された通貨ペアのsymbol（例: 'USD/JPY'）
    stopLossPips: string;         // SL幅（pips）
    takeProfitPips: string;       // TP幅（pips）
    riskPercent: string;          // リスク割合（%）デフォルト2%
    gateHelp: { rr: boolean; risk: boolean; rule: boolean };

    // === Trade-Active（進行中の取引） ===
    tradeStatus: TradeStatus;
    pending: TradeLogLite | null;
    activeLog: TradeLogLite | null;
    currentLogId: string | null;

    // === Post-Trade（取引後振り返り） ===
    postGateKept: boolean | null;
    postWithinHypo: boolean | null;
    unexpectedReason: string;

    // === アクション ===

    // Pre-Trade アクション
    setGate: (value: Partial<GateState> | ((prev: GateState) => Partial<GateState>)) => void;
    // 仮説メモ更新
    setNote: (note: string) => void;
    setSuccessProb: (v: SuccessProb) => void;
    setExpectedValue: (v: ExpectedValue) => void;
    setAccountBalance: (v: string) => void;
    setStopLossAmount: (v: string) => void;
    setTakeProfitAmount: (v: string) => void;
    // Phase 3: 通貨ペア・ピップス入力アクション
    setSelectedPairSymbol: (v: string) => void;
    setStopLossPips: (v: string) => void;
    setTakeProfitPips: (v: string) => void;
    setRiskPercent: (v: string) => void;
    setGateHelp: (updater: { rr: boolean; risk: boolean; rule: boolean } | ((prev: { rr: boolean; risk: boolean; rule: boolean }) => { rr: boolean; risk: boolean; rule: boolean })) => void;
    resetPre: () => void;

    // Trade-Active アクション
    setTradeStatus: (status: TradeStatus) => void;
    setPending: (log: TradeLogLite | null) => void;
    setActiveLog: (log: TradeLogLite | null) => void;
    setCurrentLogId: (id: string | null) => void;

    // Post-Trade アクション
    setPostGateKept: (v: boolean | null) => void;
    setPostWithinHypo: (v: boolean | null) => void;
    setUnexpectedReason: (v: string) => void;
    resetPost: () => void;

    // 全リセット
    resetAll: () => void;
}

// === 初期値定義 ===
const initialGate: GateState = {
    gate_trade_count_ok: true,
    gate_rr_ok: true,
    gate_risk_ok: true,
    gate_rule_ok: true,
};

const initialPreTrade = {
    gate: initialGate,
    note: "",
    successProb: 'mid' as SuccessProb,
    expectedValue: 'unknown' as ExpectedValue,
    accountBalance: '',
    stopLossAmount: '',
    takeProfitAmount: '',
    // Phase 3: 通貨ペア・ピップス入力
    selectedPairSymbol: '',
    stopLossPips: '',
    takeProfitPips: '',
    riskPercent: '2',              // デフォルト2%
    gateHelp: { rr: false, risk: false, rule: false },
};

const initialPostTrade = {
    postGateKept: null as boolean | null,
    postWithinHypo: null as boolean | null,
    unexpectedReason: '',
};

const initialTradeActive = {
    tradeStatus: 'idle' as TradeStatus,
    pending: null as TradeLogLite | null,
    activeLog: null as TradeLogLite | null,
    currentLogId: null as string | null,
};

// === ストア作成 ===
export const useTradeStore = create<TradeState>()(
    persist(
        (set) => ({
            // 初期状態
            ...initialPreTrade,
            ...initialTradeActive,
            ...initialPostTrade,

            // === Pre-Trade アクション ===
            setGate: (value) =>
                set((state) => {
                    const newGate =
                        typeof value === "function" ? { ...state.gate, ...value(state.gate) } : { ...state.gate, ...value };
                    return { gate: newGate };
                }),
            setNote: (note) => set({ note }),
            setSuccessProb: (successProb) => set({ successProb }),
            setExpectedValue: (expectedValue) => set({ expectedValue }),
            setAccountBalance: (accountBalance) => set({ accountBalance }),
            setStopLossAmount: (stopLossAmount) => set({ stopLossAmount }),
            setTakeProfitAmount: (takeProfitAmount) => set({ takeProfitAmount }),
            // Phase 3: 通貨ペア・ピップス入力アクション
            setSelectedPairSymbol: (selectedPairSymbol) => set({ selectedPairSymbol }),
            setStopLossPips: (stopLossPips) => set({ stopLossPips }),
            setTakeProfitPips: (takeProfitPips) => set({ takeProfitPips }),
            setRiskPercent: (riskPercent) => set({ riskPercent }),
            setGateHelp: (updater) =>
                set((state) => ({
                    gateHelp: typeof updater === 'function' ? updater(state.gateHelp) : updater,
                })),
            resetPre: () => set(initialPreTrade),

            // === Trade-Active アクション ===
            setTradeStatus: (tradeStatus) => set({ tradeStatus }),
            setPending: (pending) => set({ pending }),
            setActiveLog: (activeLog) => set({ activeLog }),
            setCurrentLogId: (currentLogId) => set({ currentLogId }),

            // === Post-Trade アクション ===
            setPostGateKept: (postGateKept) => set({ postGateKept }),
            setPostWithinHypo: (postWithinHypo) => set({ postWithinHypo }),
            setUnexpectedReason: (unexpectedReason) => set({ unexpectedReason }),
            resetPost: () => set(initialPostTrade),

            // === 全リセット ===
            resetAll: () =>
                set({
                    ...initialPreTrade,
                    ...initialTradeActive,
                    ...initialPostTrade,
                }),
        }),
        {
            name: 'fx-trade-storage',
            // 永続化するフィールドを選択（UIヘルプトグルなどは除外）
            partialize: (state) => ({
                // Pre-Trade の入力値を永続化
                gate: state.gate,
                note: state.note,
                successProb: state.successProb,
                expectedValue: state.expectedValue,
                accountBalance: state.accountBalance,
                stopLossAmount: state.stopLossAmount,
                takeProfitAmount: state.takeProfitAmount,
                // Phase 3: 通貨ペア・ピップス入力
                selectedPairSymbol: state.selectedPairSymbol,
                stopLossPips: state.stopLossPips,
                takeProfitPips: state.takeProfitPips,
                riskPercent: state.riskPercent,
                // Trade-Active（進行中の取引情報）を永続化
                tradeStatus: state.tradeStatus,
                pending: state.pending,
                activeLog: state.activeLog,
                currentLogId: state.currentLogId,
                // Post-Trade の入力値を永続化
                postGateKept: state.postGateKept,
                postWithinHypo: state.postWithinHypo,
                unexpectedReason: state.unexpectedReason,
            }),
        }
    )
);
