/**
 * データをCSV形式に変換してダウンロードする汎用関数
 * @param data - エクスポートするデータ配列
 * @param filename - ダウンロードするファイル名
 * @param addBOM - UTF-8 BOMを追加するか（日本語Excel対応）
 */
export function downloadCSV(
    data: Record<string, any>[],
    filename: string,
    addBOM: boolean = true
): void {
    if (!data || data.length === 0) {
        throw new Error('エクスポートするデータがありません');
    }

    // ヘッダー行を取得
    const headers = Object.keys(data[0]);

    // CSV本文作成
    const csvRows = [
        // ヘッダー行
        headers.map(escapeCSVValue).join(','),
        // データ行
        ...data.map((row) =>
            headers
                .map((header) => {
                    const value = row[header];
                    return escapeCSVValue(value);
                })
                .join(',')
        ),
    ];

    let csvContent = csvRows.join('\n');

    // UTF-8 BOMを追加（Excelで文字化けしないため）
    if (addBOM) {
        csvContent = '\uFEFF' + csvContent;
    }

    // Blob作成とダウンロード
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    // クリーンアップ
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * CSV用に値をエスケープする
 * @param value - エスケープする値
 * @returns エスケープされた文字列
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function escapeCSVValue(value: any): string {
    // null, undefinedは空文字列
    if (value === null || value === undefined) {
        return '';
    }

    // 日付オブジェクトはISO文字列に変換
    if (value instanceof Date) {
        return `"${value.toISOString()}"`;
    }

    // 文字列に変換
    let stringValue = String(value);

    // カンマ、改行、ダブルクォートが含まれる場合はエスケープ
    if (
        stringValue.includes(',') ||
        stringValue.includes('\n') ||
        stringValue.includes('\r') ||
        stringValue.includes('"')
    ) {
        // ダブルクォートを2つに置換してエスケープ
        stringValue = stringValue.replace(/"/g, '""');
        return `"${stringValue}"`;
    }

    return stringValue;
}
