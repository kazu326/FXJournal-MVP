import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// === 型定義 ===
export type TradeStatus = 'idle' | 'pre-entry' | 'active' | 'post-entry';
export type SuccessProb = 'high' | 'mid' | 'low';
export type ExpectedValue = 'plus' | 'minus' | 'unknown';
export type TradeMode = 'live' | 'practice';
export type PostResult = 'win' | 'loss' | 'be';
export type PostSide = 'long' | 'short';

export type RememberedPreTradeInputs = {
    accountBalance: string;
    selectedPairSymbol: string;
    accountBalanceUpdatedAt: string | null;
};

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
    currency_pair_symbol?: string | null;
    account_balance?: number | null;
    stop_loss_pips?: number | null;
    take_profit_pips?: number | null;
    calculated_lot?: number | null;
    risk_percent?: number | null;
    risk_reward_ratio?: number | null;
    note?: string | null;

    // 新仕様：取引後（post）
    post_side?: PostSide | null;
    post_result?: PostResult | null;
    post_pl?: number | null;
    post_rr_text?: string | null;
    post_rule_respected?: boolean | null;
    post_in_expected_range?: boolean | null;
    post_good_participation?: boolean | null;
    post_reference_point?: string | null;
    post_note?: string | null;
    post_gate_kept?: boolean | null;
    post_within_hypothesis?: boolean | null;
    unexpected_reason?: string | null;

    voided_at?: string | null;
    completed_at?: string | null;
}

// === ストアの状態インターフェース ===
interface TradeState {
    // mode は URL パスで管理（ストアでは不要）

    // === Pre-Trade（取引前入力） ===
    mode: TradeMode;
    gate: GateState;
    note: string;
    successProb: SuccessProb | null;
    expectedValue: ExpectedValue;
    accountBalance: string;
    stopLossAmount: string;
    takeProfitAmount: string;
    // Phase 3: 通貨ペア・ピップス入力
    selectedPairSymbol: string;   // 選択された通貨ペアのsymbol（例: 'USD/JPY'）
    entryRate: string;            // 今回のエントリー予定レート（下書き）
    stopLossPrice: string;        // 今回の損切り価格（下書き）
    stopLossPips: string;         // SL幅（pips）
    takeProfitPips: string;       // TP幅（pips）
    riskPercent: string;          // リスク割合（%）デフォルト2%
    gateHelp: { rr: boolean; risk: boolean; rule: boolean };
    rememberedPreTradeInputs: Record<TradeMode, RememberedPreTradeInputs>;

    // 環境認識タグ（10個）
    preEnvSign: boolean;
    preEnvTrend4hUp: boolean;
    preEnvRange4h: boolean;
    preEnvSupport15m: boolean;
    preEnvLongWick15m: boolean;
    preEnvFlag: boolean;
    preEnvTriangle: boolean;
    preEnvLondon: boolean;
    preEnvNewyork: boolean;
    preEnvAsPlanned: boolean;

    // === Trade-Active（進行中の取引） ===
    tradeStatus: TradeStatus;
    pending: TradeLogLite | null;
    activeLog: TradeLogLite | null;
    currentLogId: string | null;

    // === Post-Trade（取引後振り返り） ===
    postSide: PostSide | null;
    postResult: PostResult | null;
    postPl: string; // 入力時は string で管理
    postRrText: string;
    postRuleRespected: boolean | null;
    postInExpectedRange: boolean | null;
    postGoodParticipation: boolean | null;
    postReferencePoint: string;
    postNote: string;

    // === アクション ===

    // Pre-Trade アクション
    setMode: (v: TradeMode) => void;
    setGate: (value: Partial<GateState> | ((prev: GateState) => Partial<GateState>)) => void;
    // 仮説メモ更新
    setNote: (note: string) => void;
    setSuccessProb: (v: SuccessProb | null) => void;
    setExpectedValue: (v: ExpectedValue) => void;
    setAccountBalance: (v: string) => void;
    setStopLossAmount: (v: string) => void;
    setTakeProfitAmount: (v: string) => void;
    // Phase 3: 通貨ペア・ピップス入力アクション
    setSelectedPairSymbol: (v: string) => void;
    setEntryRate: (v: string) => void;
    setStopLossPrice: (v: string) => void;
    setStopLossPips: (v: string) => void;
    setTakeProfitPips: (v: string) => void;
    setRiskPercent: (v: string) => void;
    setGateHelp: (updater: { rr: boolean; risk: boolean; rule: boolean } | ((prev: { rr: boolean; risk: boolean; rule: boolean }) => { rr: boolean; risk: boolean; rule: boolean })) => void;

    // 環境認識タグ setter
    setPreEnv: (update: Partial<{
        preEnvSign: boolean;
        preEnvTrend4hUp: boolean;
        preEnvRange4h: boolean;
        preEnvSupport15m: boolean;
        preEnvLongWick15m: boolean;
        preEnvFlag: boolean;
        preEnvTriangle: boolean;
        preEnvLondon: boolean;
        preEnvNewyork: boolean;
        preEnvAsPlanned: boolean;
    }>) => void;

    resetPre: () => void;

    // Trade-Active アクション
    setTradeStatus: (status: TradeStatus) => void;
    setPending: (log: TradeLogLite | null) => void;
    setActiveLog: (log: TradeLogLite | null) => void;
    setCurrentLogId: (id: string | null) => void;

    // Post-Trade アクション
    setPostSide: (v: PostSide | null) => void;
    setPostResult: (v: PostResult | null) => void;
    setPostPl: (v: string) => void;
    setPostRrText: (v: string) => void;
    setPostRuleRespected: (v: boolean | null) => void;
    setPostInExpectedRange: (v: boolean | null) => void;
    setPostGoodParticipation: (v: boolean | null) => void;
    setPostReferencePoint: (v: string) => void;
    setPostNote: (v: string) => void;
    resetPost: () => void;

    // 全リセット
    resetAll: () => void;
}

// === 初期値定義 ===
const initialGate: GateState = {
    gate_trade_count_ok: true,
    gate_rr_ok: true,
    gate_risk_ok: true,
    gate_rule_ok: false,
};

const initialPreTrade = {
    mode: 'live' as TradeMode,
    gate: initialGate,
    note: "",
    successProb: null as SuccessProb | null,
    expectedValue: 'unknown' as ExpectedValue,
    accountBalance: '',
    stopLossAmount: '',
    takeProfitAmount: '',
    // Phase 3: 通貨ペア・ピップス入力
    selectedPairSymbol: '',
    entryRate: '',
    stopLossPrice: '',
    stopLossPips: '',
    takeProfitPips: '',
    riskPercent: '2',              // デフォルト2%
    gateHelp: { rr: false, risk: false, rule: false },
    rememberedPreTradeInputs: {
        live: {
            accountBalance: '',
            selectedPairSymbol: '',
            accountBalanceUpdatedAt: null,
        },
        practice: {
            accountBalance: '',
            selectedPairSymbol: '',
            accountBalanceUpdatedAt: null,
        },
    } satisfies Record<TradeMode, RememberedPreTradeInputs>,

    // 環境認識タグ初期値
    preEnvSign: false,
    preEnvTrend4hUp: false,
    preEnvRange4h: false,
    preEnvSupport15m: false,
    preEnvLongWick15m: false,
    preEnvFlag: false,
    preEnvTriangle: false,
    preEnvLondon: false,
    preEnvNewyork: false,
    preEnvAsPlanned: false,
};

const initialPostTrade = {
    postSide: null as PostSide | null,
    postResult: null as PostResult | null,
    postPl: '',
    postRrText: '',
    postRuleRespected: null as boolean | null,
    postInExpectedRange: null as boolean | null,
    postGoodParticipation: null as boolean | null,
    postReferencePoint: '',
    postNote: '',
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
            setMode: (mode) =>
                set((state) => {
                    const remembered = state.rememberedPreTradeInputs[mode];
                    return {
                        mode,
                        accountBalance: remembered.accountBalance,
                        selectedPairSymbol: remembered.selectedPairSymbol,
                    };
                }),
            setGate: (value) =>
                set((state) => {
                    const newGate =
                        typeof value === "function" ? { ...state.gate, ...value(state.gate) } : { ...state.gate, ...value };
                    return { gate: newGate };
                }),
            setNote: (note) => set({ note }),
            setSuccessProb: (successProb) => set({ successProb }),
            setExpectedValue: (expectedValue) => set({ expectedValue }),
            setAccountBalance: (accountBalance) =>
                set((state) => ({
                    accountBalance,
                    rememberedPreTradeInputs: {
                        ...state.rememberedPreTradeInputs,
                        [state.mode]: {
                            ...state.rememberedPreTradeInputs[state.mode],
                            accountBalance,
                            accountBalanceUpdatedAt: accountBalance
                                ? new Date().toISOString()
                                : null,
                        },
                    },
                })),
            setStopLossAmount: (stopLossAmount) => set({ stopLossAmount }),
            setTakeProfitAmount: (takeProfitAmount) => set({ takeProfitAmount }),
            // Phase 3: 通貨ペア・ピップス入力アクション
            setSelectedPairSymbol: (selectedPairSymbol) =>
                set((state) => ({
                    selectedPairSymbol,
                    rememberedPreTradeInputs: {
                        ...state.rememberedPreTradeInputs,
                        [state.mode]: {
                            ...state.rememberedPreTradeInputs[state.mode],
                            selectedPairSymbol,
                        },
                    },
                })),
            setEntryRate: (entryRate) => set({ entryRate }),
            setStopLossPrice: (stopLossPrice) => set({ stopLossPrice }),
            setStopLossPips: (stopLossPips) => set({ stopLossPips }),
            setTakeProfitPips: (takeProfitPips) => set({ takeProfitPips }),
            setRiskPercent: (riskPercent) => set({ riskPercent }),
            setGateHelp: (updater) =>
                set((state) => ({
                    gateHelp: typeof updater === 'function' ? updater(state.gateHelp) : updater,
                })),
            setPreEnv: (update) => set((state) => ({ ...state, ...update })),
            resetPre: () =>
                set((state) => {
                    const remembered = state.rememberedPreTradeInputs[state.mode];
                    return {
                        ...initialPreTrade,
                        mode: state.mode,
                        accountBalance: remembered.accountBalance,
                        selectedPairSymbol: remembered.selectedPairSymbol,
                        rememberedPreTradeInputs: state.rememberedPreTradeInputs,
                    };
                }),

            // === Trade-Active アクション ===
            setTradeStatus: (tradeStatus) => set({ tradeStatus }),
            setPending: (pending) => set({ pending }),
            setActiveLog: (activeLog) => set({ activeLog }),
            setCurrentLogId: (currentLogId) => set({ currentLogId }),

            // === Post-Trade アクション ===
            setPostSide: (postSide) => set({ postSide }),
            setPostResult: (postResult) => set({ postResult }),
            setPostPl: (postPl) => set({ postPl }),
            setPostRrText: (postRrText) => set({ postRrText }),
            setPostRuleRespected: (postRuleRespected) => set({ postRuleRespected }),
            setPostInExpectedRange: (postInExpectedRange) => set({ postInExpectedRange }),
            setPostGoodParticipation: (postGoodParticipation) => set({ postGoodParticipation }),
            setPostReferencePoint: (postReferencePoint) => set({ postReferencePoint }),
            setPostNote: (postNote) => set({ postNote }),
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
            version: 1,
            migrate: (persistedState, version) => {
                const state = persistedState as Partial<TradeState>;
                if (version >= 1 && state.rememberedPreTradeInputs) {
                    return state as TradeState;
                }

                const rememberedPreTradeInputs = {
                    live: {
                        accountBalance: '',
                        selectedPairSymbol: '',
                        accountBalanceUpdatedAt: null,
                    },
                    practice: {
                        accountBalance: '',
                        selectedPairSymbol: '',
                        accountBalanceUpdatedAt: null,
                    },
                } satisfies Record<TradeMode, RememberedPreTradeInputs>;
                const mode = state.mode ?? 'live';
                rememberedPreTradeInputs[mode] = {
                    accountBalance: state.accountBalance ?? '',
                    selectedPairSymbol: state.selectedPairSymbol ?? '',
                    accountBalanceUpdatedAt: null,
                };

                return {
                    ...state,
                    rememberedPreTradeInputs,
                } as TradeState;
            },
            // 永続化するフィールドを選択（UIヘルプトグルなどは除外）
            partialize: (state) => ({
                // Pre-Trade の入力値を永続化
                mode: state.mode,
                gate: state.gate,
                note: state.note,
                successProb: state.successProb,
                expectedValue: state.expectedValue,
                accountBalance: state.accountBalance,
                stopLossAmount: state.stopLossAmount,
                takeProfitAmount: state.takeProfitAmount,
                // Phase 3: 通貨ペア・ピップス入力
                selectedPairSymbol: state.selectedPairSymbol,
                entryRate: state.entryRate,
                stopLossPrice: state.stopLossPrice,
                stopLossPips: state.stopLossPips,
                takeProfitPips: state.takeProfitPips,
                riskPercent: state.riskPercent,
                rememberedPreTradeInputs: state.rememberedPreTradeInputs,

                // 環境認識タグ
                preEnvSign: state.preEnvSign,
                preEnvTrend4hUp: state.preEnvTrend4hUp,
                preEnvRange4h: state.preEnvRange4h,
                preEnvSupport15m: state.preEnvSupport15m,
                preEnvLongWick15m: state.preEnvLongWick15m,
                preEnvFlag: state.preEnvFlag,
                preEnvTriangle: state.preEnvTriangle,
                preEnvLondon: state.preEnvLondon,
                preEnvNewyork: state.preEnvNewyork,
                preEnvAsPlanned: state.preEnvAsPlanned,

                // Trade-Active（進行中の取引情報）を永続化
                tradeStatus: state.tradeStatus,
                pending: state.pending,
                activeLog: state.activeLog,
                currentLogId: state.currentLogId,

                // Post-Trade の入力値を永続化
                postSide: state.postSide,
                postResult: state.postResult,
                postPl: state.postPl,
                postRrText: state.postRrText,
                postRuleRespected: state.postRuleRespected,
                postInExpectedRange: state.postInExpectedRange,
                postGoodParticipation: state.postGoodParticipation,
                postReferencePoint: state.postReferencePoint,
                postNote: state.postNote,
            }),
        }
    )
);
