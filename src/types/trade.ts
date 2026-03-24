export type TradeStatus = 'open' | 'closed' | 'cancelled';
export type TradeMode = 'live' | 'practice';
export type SuccessProb = 'high' | 'mid' | 'low';
export type ExpectedValue = 'plus' | 'minus' | 'unknown';
export type PostResult = 'win' | 'loss' | 'be';
export type PostSide = 'long' | 'short';

export interface TradeRecord {
    id: string; // uuid
    user_id: string;
    trade_datetime: string; // ISO or timestamptz
    symbol: string;
    mode: TradeMode;

    // 取引前（pre）
    pre_planned_risk_pct: number | null;
    pre_planned_rr: number | null;
    pre_lot_size: number | null;
    pre_note: string | null;

    // 環境認識タグ（10個）
    pre_env_sign: boolean;
    pre_env_trend4h_up: boolean;
    pre_env_range4h: boolean;
    pre_env_support15m: boolean;
    pre_env_long_wick15m: boolean;
    pre_env_flag: boolean;
    pre_env_triangle: boolean;
    pre_env_london: boolean;
    pre_env_newyork: boolean;
    pre_env_as_planned: boolean;

    // 取引後（post）
    post_side: PostSide | null;
    post_result: PostResult | null;
    post_pl: number | null;
    post_rr_text: string | null;
    post_rule_respected: boolean | null;
    post_in_expected_range: boolean | null;
    post_good_participation: boolean | null;
    post_reference_point: string | null;
    post_note: string | null;

    created_at: string;
    updated_at?: string;
}

export interface Trade extends TradeRecord {
    // 既存の Trade 型との互換性のためのエイリアス
    direction: PostSide | 'long' | 'short'; // direction is legacy, use post_side
    entry_price: number;
    exit_price?: number;
    lot_size: number;
    entry_time: string;
    exit_time?: string;
    pnl?: number;
    rule_tags: string[];
    planned_rr?: number;
    status: TradeStatus;
    note?: string;
}

export interface MT4Row {
    ticket: string;
    symbol: string;
    type: string;
    volume: number;
    openTime: string;
    openPrice: number;
    closeTime: string;
    closePrice: number;
    profit: number;
}
