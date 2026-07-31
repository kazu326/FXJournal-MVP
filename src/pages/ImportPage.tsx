import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';




function parseMT4Sheet(workbook: XLSX.WorkBook): any[] {
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    return rows.slice(1).filter((r) => r[0]).map((r) => ({
        ticket: String(r[0]),
        symbol: String(r[2]),
        type: String(r[3]),
        volume: Number(r[4]),
        openTime: String(r[5]),
        openPrice: Number(r[6]),
        closeTime: String(r[10]),
        closePrice: Number(r[11]),
        profit: Number(r[15]),
    }));
}

function mt4RowToTrade(row: any, userId: string): any {
    return {
        user_id: userId,
        symbol: row.symbol,
        direction: row.type.toLowerCase().includes('buy') ? 'long' : 'short',
        entry_price: row.openPrice,
        exit_price: row.closePrice,
        lot_size: row.volume,
        entry_time: row.openTime,
        exit_time: row.closeTime,
        pnl: row.profit,
        rule_tags: [],
        status: 'closed',
    };
}

export default function ImportPage() {
    const [preview, setPreview] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        setPreview(parseMT4Sheet(wb));
    }


    async function handleImport() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setMessage('未ログイン'); setLoading(false); return; }
        const trades = preview.map((r) => mt4RowToTrade(r, user.id));
        const { error } = await supabase.from('trades').insert(trades);
        setMessage(error ? `エラー: ${error.message}` : `${trades.length}件インポート完了`);
        setLoading(false);
    }

    return (
        <div className="p-4">
            <h1 className="text-xl font-bold mb-4">MT4/MT5 インポート</h1>
            <input type="file" accept=".xls,.xlsx,.csv" onChange={handleFile} className="mb-4" />
            {preview.length > 0 && (
                <>
                    <p className="mb-2">{preview.length}件検出</p>
                    <table className="text-sm border-collapse mb-4 w-full">
                        <thead>
                            <tr>{['Ticket', 'Symbol', 'Type', 'Volume', 'OpenPrice', 'ClosePrice', 'Profit'].map(h => (
                                <th key={h} className="border px-2 py-1 bg-gray-100">{h}</th>
                            ))}</tr>
                        </thead>
                        <tbody>
                            {preview.slice(0, 5).map((r) => (
                                <tr key={r.ticket}>
                                    {[r.ticket, r.symbol, r.type, r.volume, r.openPrice, r.closePrice, r.profit].map((v, i) => (
                                        <td key={i} className="border px-2 py-1">{v}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button onClick={handleImport} disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
                        {loading ? 'インポート中...' : 'インポート実行'}
                    </button>
                </>
            )}
            {message && <p className="mt-4 text-green-700">{message}</p>}
        </div>
    );
}
