/**
 * 通貨ペアに応じた1pipの値を返す
 * JPY絡みは小数点2桁 (1pip = 0.01)
 * それ以外は小数点4桁 (1pip = 0.0001)
 */
export function getPipValue(pair: string): number {
    const p = pair.toUpperCase();
    if (p.includes('JPY')) return 0.01;
    if (p.includes('XAU')) return 0.01; // Gold is typically 2 decimal places
    return 0.0001;
}

/**
 * Frankfurter APIを使用して最新レートを取得する
 */
export async function fetchFrankfurterRate(pair: string): Promise<number | null> {
    try {
        const [base, quote] = pair.toUpperCase().split('/');
        if (!base || !quote) return null;

        // Frankfurter APIはベース通貨が quote と等しい場合エラーを返す可能性があるため
        // (例: USD/USD は不正なリクエスト)
        if (base === quote) return 1.0;

        const res = await fetch(`https://api.frankfurter.app/latest?from=${base}&to=${quote}`);
        if (!res.ok) {
            return null;
        }
        const data = await res.json();
        return data.rates?.[quote] ?? null;
    } catch (error) {
        console.error('Frankfurter API fetch error:', error);
        return null;
    }
}

/**
 * 通貨ペアに応じたエントリー価格の入力例（プレースホルダー）を返す
 */
export function getEntryPricePlaceholder(symbol: string | undefined): string {
    if (!symbol) return '例: 1.0850';
    if (symbol.includes('JPY')) return '例: 154.50';
    if (symbol.startsWith('XAU')) return '例: 4520.00'; // 金スポット
    if (symbol.startsWith('XAG')) return '例: 68.50';   // 銀スポット
    if (symbol.includes('GBP')) return '例: 1.2950';
    if (symbol.includes('AUD') || symbol.includes('NZD')) return '例: 0.6250';
    if (symbol.includes('EUR')) return '例: 1.0850';
    return '例: 1.0850'; // デフォルト
}

/**
 * 通貨ペアに応じた損切り価格の入力例（プレースホルダー）を返す
 */
export function getStopLossPricePlaceholder(symbol: string | undefined): string {
    if (symbol?.startsWith('XAU')) return '例: 4495.00';
    if (symbol?.startsWith('XAG')) return '例: 67.50';
    if (symbol?.includes('JPY')) return '例: 153.50';
    return '例: 1.0800';
}
