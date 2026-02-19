import { supabase } from '../lib/supabase';

export interface ExchangeRate {
    id: string;
    currency_code: string;
    jpy_rate: number;
    updated_at: string;
    updated_by?: string;
}

/**
 * 全ての為替レートを取得
 */
export const getExchangeRates = async (): Promise<ExchangeRate[]> => {
    const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .order('currency_code');

    if (error) {
        console.error('Error fetching exchange rates:', error);
        throw error;
    }

    return data || [];
};

/**
 * 特定通貨の為替レートを更新
 */
export const updateExchangeRate = async (
    currencyCode: string,
    newRate: number
): Promise<void> => {
    const { data: user } = await supabase.auth.getUser();

    const { error } = await supabase
        .from('exchange_rates')
        .update({
            jpy_rate: newRate,
            updated_by: user.user?.id
        })
        .eq('currency_code', currencyCode);

    if (error) {
        console.error('Error updating exchange rate:', error);
        throw error;
    }
};

/**
 * 特定通貨の対円レートを取得（計算用）
 */
export const getJPYRate = async (quoteCurrency: string): Promise<number> => {
    // クロス円の場合はレート不要
    if (quoteCurrency === 'JPY') {
        return 1;
    }

    const { data, error } = await supabase
        .from('exchange_rates')
        .select('jpy_rate')
        .eq('currency_code', quoteCurrency)
        .single();

    if (error) {
        console.error(`Error fetching JPY rate for ${quoteCurrency}:`, error);
        // フォールバック値を返す（ユーザー指定により150ではなく100等の安全値、またはエラーをスローせずデフォルト値を返す）
        // ユーザーリクエストには `return data?.jpy_rate || 100;` とある
        return 100;
    }

    return data?.jpy_rate || 100;
};
