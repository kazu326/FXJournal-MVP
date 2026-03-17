export type TradeStatus = 'open' | 'closed' | 'cancelled';

export interface Trade {
    id: string;
    user_id: string;
    symbol: string;
    direction: 'long' | 'short';
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
    created_at: string;
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
