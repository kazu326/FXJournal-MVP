import { useState, useEffect } from 'react';
import {
    getExchangeRates,
    updateExchangeRate,
    type ExchangeRate
} from '../../services/exchangeRateService';
import { Save, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

interface DefaultSettings {
    base_capital: number;
    max_risk_percent: number;
    weekly_limit: number;
    min_lot: number;
    account_type: string;
}

export default function AdminSettingsPage() {
    const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
    const [defaultSettings, setDefaultSettings] = useState<DefaultSettings>({
        base_capital: 100000,
        max_risk_percent: 2,
        weekly_limit: 2,
        min_lot: 0.01,
        account_type: 'standard'
    });
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // データ取得
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const rates = await getExchangeRates();
            setExchangeRates(rates);

            // デフォルト設定をローカルストレージから取得
            const saved = localStorage.getItem('default_settings');
            if (saved) {
                setDefaultSettings(JSON.parse(saved));
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            setErrorMessage('データの読み込みに失敗しました');
        } finally {
            setLoading(false);
        }
    };

    // 為替レート更新
    const handleUpdateRate = async (currencyCode: string, newRate: number) => {
        if (newRate <= 0) {
            alert('0より大きい値を入力してください');
            return;
        }

        setLoading(true);
        setSuccessMessage('');
        setErrorMessage('');

        try {
            await updateExchangeRate(currencyCode, newRate);
            setSuccessMessage(`${currencyCode}のレートを更新しました`);
            await loadData();
        } catch (error: any) {
            setErrorMessage(`更新エラー: ${error.message || '不明なエラー'}`);
        } finally {
            setLoading(false);
        }
    };

    // デフォルト設定保存
    const handleSaveDefaultSettings = () => {
        try {
            localStorage.setItem('default_settings', JSON.stringify(defaultSettings));
            setSuccessMessage('デフォルト設定を保存しました');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setErrorMessage('保存に失敗しました');
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8 pb-20">
            <header className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <RefreshCw className="w-6 h-6 text-emerald-400" />
                    システム設定
                </h1>
                <p className="text-slate-400">アプリ全体のパラメーターとデフォルト値を管理します。</p>
            </header>

            {/* メッセージ表示エリア */}
            {successMessage && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <CheckCircle className="w-5 h-5" />
                    {successMessage}
                </div>
            )}
            {errorMessage && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <AlertTriangle className="w-5 h-5" />
                    {errorMessage}
                </div>
            )}

            {/* 為替レート設定 */}
            <section className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-white mb-1">為替レート設定 (対円)</h2>
                        <p className="text-xs text-slate-500">週1回程度の更新を推奨します。</p>
                    </div>
                    <span className="text-xs text-slate-600 font-mono">
                        Last Update: {exchangeRates[0]?.updated_at ? new Date(exchangeRates[0].updated_at).toLocaleString() : '-'}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {exchangeRates.map(rate => (
                        <div key={rate.currency_code} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-slate-200 text-lg">{rate.currency_code}/JPY</span>
                                <span className="text-xs text-slate-500 bg-slate-900 px-2 py-0.5 rounded">Current</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    step="0.01"
                                    defaultValue={rate.jpy_rate}
                                    className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-right font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                    id={`rate-${rate.currency_code}`}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const input = e.currentTarget;
                                            handleUpdateRate(rate.currency_code, Number(input.value));
                                        }
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        const input = document.getElementById(`rate-${rate.currency_code}`) as HTMLInputElement;
                                        handleUpdateRate(rate.currency_code, Number(input.value));
                                    }}
                                    disabled={loading}
                                    className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* デフォルトユーザー設定 */}
            <section className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-white mb-1">デフォルトユーザー設定</h2>
                        <p className="text-xs text-slate-500">新規登録ユーザーに適用される初期値です。</p>
                    </div>
                    <button
                        onClick={handleSaveDefaultSettings}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-lg shadow-emerald-900/20"
                    >
                        <Save className="w-4 h-4" />
                        設定を一括保存
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">基準資金 (JPY)</label>
                        <input
                            type="number"
                            value={defaultSettings.base_capital}
                            onChange={(e) => setDefaultSettings({
                                ...defaultSettings,
                                base_capital: Number(e.target.value)
                            })}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                        />
                        <p className="text-xs text-slate-500">デモトレード開始時の初期資金</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">リスク許容率 (%)</label>
                        <select
                            value={defaultSettings.max_risk_percent}
                            onChange={(e) => setDefaultSettings({
                                ...defaultSettings,
                                max_risk_percent: Number(e.target.value)
                            })}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all appearance-none"
                        >
                            <option value={1}>1% (超保守的)</option>
                            <option value={2}>2% (推奨 - 破産確率ほぼ0%)</option>
                            <option value={3}>3% (中級者向け)</option>
                            <option value={5}>5% (ハイリスク)</option>
                        </select>
                        <p className="text-xs text-slate-500">1トレードあたりの最大損失許容率</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">週間トレード制限 (回)</label>
                        <select
                            value={defaultSettings.weekly_limit}
                            onChange={(e) => setDefaultSettings({
                                ...defaultSettings,
                                weekly_limit: Number(e.target.value)
                            })}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all appearance-none"
                        >
                            <option value={2}>2回 (初心者 - ポジポジ病防止)</option>
                            <option value={5}>5回 (中級者)</option>
                            <option value={10}>10回 (上級者)</option>
                            <option value={999}>制限なし</option>
                        </select>
                        <p className="text-xs text-slate-500">週あたりのエントリー回数上限</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">最小ロット</label>
                        <input
                            type="number"
                            step="0.01"
                            value={defaultSettings.min_lot}
                            onChange={(e) => setDefaultSettings({
                                ...defaultSettings,
                                min_lot: Number(e.target.value)
                            })}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                        />
                        <p className="text-xs text-slate-500">マイクロ口座などは0.01、標準は0.1など</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">口座タイプ</label>
                        <select
                            value={defaultSettings.account_type}
                            onChange={(e) => setDefaultSettings({
                                ...defaultSettings,
                                account_type: e.target.value
                            })}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all appearance-none"
                        >
                            <option value="standard">Standard (1lot=100k)</option>
                            <option value="micro">Micro (1lot=1k)</option>
                            <option value="pro">Pro</option>
                        </select>
                        <p className="text-xs text-slate-500">契約サイズに影響します</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
