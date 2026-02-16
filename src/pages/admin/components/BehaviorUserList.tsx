import React from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

interface BehaviorData {
    user_id: string;
    username: string;
    avatar_url?: string | null;
    first_learning_date: string | null;
    avg_trades_before: number;
    avg_trades_after: number;
    trades_before?: number;
    trades_after?: number;
    change_percentage: number;
}

interface BehaviorUserListProps {
    users: BehaviorData[];
}

export const BehaviorUserList: React.FC<BehaviorUserListProps> = ({ users }) => {

    // Calculates trades per week based on total trades and elapsed time since learning
    const calculateWeeklyFreq = (trades: number, startDateStr: string | null): number => {
        if (!startDateStr || trades === 0) return 0;
        const start = new Date(startDateStr);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - start.getTime());
        const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        const weeks = diffDays / 7;
        return trades / weeks; // trades pe week
    };

    return (
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800">
                <h3 className="text-sm font-medium text-slate-400">ユーザー別変化率リスト</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-950/50 text-slate-200 uppercase text-xs font-semibold">
                        <tr>
                            <th className="px-6 py-3">ユーザー</th>
                            <th className="px-6 py-3">学習開始日</th>
                            <th className="px-6 py-3 text-right">Before (週換算)</th>
                            <th className="px-6 py-3 text-right">After (週換算)</th>
                            <th className="px-6 py-3 text-right">ルール遵守 (週2回未満)</th>
                            <th className="px-6 py-3 text-right">変化率</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {users.map((user) => {
                            // Use pre-calculated averages from parent (which now use "elapsed time" for After)
                            const weeklyBefore = user.avg_trades_before * 7;
                            const weeklyAfter = user.avg_trades_after * 7;

                            const isCompliant = weeklyAfter < 2.0;

                            return (
                                <tr key={user.user_id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
                                                    {user.username.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <span className="font-medium text-slate-200">{user.username}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {user.first_learning_date ? new Date(user.first_learning_date).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-300">
                                        {weeklyBefore.toFixed(1)} <span className="text-xs text-slate-500">回/週</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-300">
                                        {weeklyAfter.toFixed(1)} <span className="text-xs text-slate-500">回/週</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {isCompliant ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                ✅ OK
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                                ⚠️ Over
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className={`flex items-center justify-end gap-1 font-mono font-medium ${user.change_percentage < 0 ? 'text-emerald-400' :
                                            user.change_percentage > 0 ? 'text-rose-400' : 'text-slate-500'
                                            }`}>
                                            {user.change_percentage < 0 ? <ArrowDown size={14} /> :
                                                user.change_percentage > 0 ? <ArrowUp size={14} /> : <Minus size={14} />}
                                            {Math.abs(user.change_percentage).toFixed(1)}%
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
