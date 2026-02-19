import type { CurrencyPair } from '../services/currencyPairService';

// === 型定義 ===
export interface LotCalculationInput {
    pair: CurrencyPair;        // 選択された通貨ペア
    accountBalance: number;    // 口座残高（円）
    riskPercent: number;       // リスク割合（例: 2 = 2%）
    stopLossPips: number;      // ストップロス幅（pips）
    jpyRate?: number;          // 決済通貨対円レート（JPYペアの場合は不要、デフォルト1）
}

export interface LotCalculationResult {
    recommendedLot: number;     // 推奨ロット数
    riskAmountYen: number;      // リスク許容額（円）
    onePipValueYen: number;     // 1pipあたりの価値（円/1ロット）
}

export interface TradeMetricsResult extends LotCalculationResult {
    lotSize: number;           // recommendedLotのエイリアス（互換性のため）
    takeProfitAmount: number;  // 利確金額（円）
    riskRewardRatio: number;   // リスクリワード比
    riskAmount: number;        // 実質リスク金額（円）
    pipValue: number;          // onePipValueYenのエイリアス
    isRiskOk: boolean;         // リスク2%以内かどうか
    isRrOk: boolean;           // RR 2.7:1 以上かどうか
}

/**
 * 1pipの金額（円換算）を計算（互換用ラッパー）
 */
export function calcPipValueJPY(pair: CurrencyPair, jpyRate: number = 1): number {
    let onePipValueYen: number;
    if (pair.quote_currency === 'JPY') {
        onePipValueYen = pair.contract_size * 0.01;
    } else {
        let pipSize: number;
        if (pair.pip_position === 5) pipSize = 0.0001;
        else if (pair.pip_position === 2 || pair.pip_position === 3) pipSize = 0.01;
        else pipSize = Math.pow(10, -(pair.pip_position - 1));
        onePipValueYen = pair.contract_size * pipSize * jpyRate;
    }
    return onePipValueYen;
}

/**
 * 口座残高・リスク%・SL pipsからロット数を自動計算（互換用ラッパー）
 */
export function calculateLotSize(input: LotCalculationInput): number {
    return calculateLot(input).recommendedLot;
}

/**
 * ロット計算ロジック - 最終仕様
 */
export const calculateLot = (input: LotCalculationInput): LotCalculationResult => {
    const { pair, accountBalance, riskPercent, stopLossPips, jpyRate = 1 } = input;

    // Step 1: リスク許容額を計算
    const riskAmountYen = accountBalance * (riskPercent / 100);

    // Step 2: 1ロット・1pipsあたりの価値（円）を計算
    const onePipValueYen = calcPipValueJPY(pair, jpyRate);

    // Step 3: 推奨ロット数を計算
    // ゼロ除算防止
    if (stopLossPips <= 0 || onePipValueYen <= 0) {
        return {
            recommendedLot: 0,
            riskAmountYen: Math.floor(riskAmountYen),
            onePipValueYen
        };
    }

    const recommendedLot = riskAmountYen / (stopLossPips * onePipValueYen);

    // 0.01ロット単位に切り捨て
    const lotRounded = Math.floor(recommendedLot * 100) / 100;

    return {
        recommendedLot: lotRounded,
        riskAmountYen: Math.floor(riskAmountYen),
        onePipValueYen
    };
};

/**
 * 完全な計算結果を返す（UI表示用、旧calculateTradeMetricsの置き換え）
 */
export function calculateTradeMetrics(
    input: LotCalculationInput & { takeProfitPips: number }
): TradeMetricsResult {
    const { takeProfitPips, stopLossPips, accountBalance } = input;

    // 基本計算を実行
    const baseResult = calculateLot(input);
    const { recommendedLot, onePipValueYen } = baseResult;

    // リスク金額 (実際のロット数に基づく)
    const actualRiskAmount = recommendedLot * stopLossPips * onePipValueYen;

    // 利確金額 = ロット × TP pips × 1pip価値
    const takeProfitAmount = recommendedLot * takeProfitPips * onePipValueYen;

    // リスクリワード比
    const riskRewardRatio = stopLossPips > 0 ? takeProfitPips / stopLossPips : 0;

    // 実際のリスク%
    const actualRiskPercent = accountBalance > 0 ? (actualRiskAmount / accountBalance) * 100 : 0;

    return {
        ...baseResult,
        lotSize: recommendedLot, // エイリアス
        riskAmount: Math.round(actualRiskAmount),
        takeProfitAmount: Math.round(takeProfitAmount),
        riskRewardRatio: Number(riskRewardRatio.toFixed(2)),
        pipValue: Number(onePipValueYen.toFixed(2)),
        isRiskOk: actualRiskPercent <= 2.1, // 0.1%の誤差は許容
        isRrOk: riskRewardRatio >= 2.7,
    };
}

/**
 * 金額からpipsを逆算（旧入力方式との互換用）
 */
export function amountToPips(
    amount: number,
    lotSize: number,
    pair: CurrencyPair,
    jpyRate: number = 1
): number {
    const pipValue = calcPipValueJPY(pair, jpyRate);
    if (lotSize <= 0 || pipValue <= 0) return 0;
    return Number((amount / (lotSize * pipValue)).toFixed(1));
}
