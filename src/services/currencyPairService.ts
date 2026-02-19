import { supabase } from '../lib/supabase';

// === 型定義 ===
export interface CurrencyPair {
    id: string;
    symbol: string;         // 例: "EUR/USD"
    base_currency: string;  // 例: "EUR"
    quote_currency: string; // 例: "USD"
    pip_position: number;   // pip桁数（通常4、JPYペアは2→DB上は5）
    contract_size: number;  // 1ロットの契約サイズ（通常100000）
    min_lot: number;        // 最小ロットサイズ（通常0.01）
    is_active: boolean;
}

// === キャッシュ管理 ===
let cachedPairs: CurrencyPair[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5分キャッシュ

/**
 * Supabaseから有効な通貨ペア一覧を取得（キャッシュ付き）
 */
export async function fetchCurrencyPairs(): Promise<CurrencyPair[]> {
    const now = Date.now();
    if (cachedPairs && now - cacheTimestamp < CACHE_TTL) {
        return cachedPairs;
    }

    const { data, error } = await supabase
        .from('currency_pairs')
        .select('id, symbol, base_currency, quote_currency, pip_position, contract_size, min_lot, is_active')
        .eq('is_active', true)
        .order('symbol');

    if (error) {
        console.error('通貨ペア取得失敗:', error.message);
        // キャッシュがあればフォールバック
        return cachedPairs ?? [];
    }

    cachedPairs = (data ?? []) as CurrencyPair[];
    cacheTimestamp = now;
    return cachedPairs;
}

/**
 * symbolから通貨ペアを検索
 */
export function findPairBySymbol(pairs: CurrencyPair[], symbol: string): CurrencyPair | undefined {
    return pairs.find(p => p.symbol === symbol);
}

/**
 * 人気ペア（日本人トレーダー向け）を上位にソートして返す
 */
export function sortPairsForJP(pairs: CurrencyPair[]): CurrencyPair[] {
    // 日本人トレーダーに人気のペア（上位表示）
    const popularOrder = [
        'USD/JPY', 'EUR/USD', 'EUR/JPY', 'GBP/JPY', 'GBP/USD',
        'AUD/JPY', 'AUD/USD', 'NZD/JPY', 'NZD/USD', 'CAD/JPY',
        'XAU/USD', // ゴールド
    ];

    return [...pairs].sort((a, b) => {
        const aIdx = popularOrder.indexOf(a.symbol);
        const bIdx = popularOrder.indexOf(b.symbol);
        // 人気リストにあるものは先頭、なければ末尾（アルファベット順）
        if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
        if (aIdx >= 0) return -1;
        if (bIdx >= 0) return 1;
        return a.symbol.localeCompare(b.symbol);
    });
}
