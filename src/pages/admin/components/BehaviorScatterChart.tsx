import React from 'react';
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Cell
} from 'recharts';

interface BehaviorData {
    user_id: string;
    username: string;
    avg_trades_before: number;
    avg_trades_after: number;
    change_percentage: number;
}

interface BehaviorScatterChartProps {
    data: BehaviorData[];
}

export const BehaviorScatterChart: React.FC<BehaviorScatterChartProps> = ({ data }) => {
    // Tooltip content component
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const item = payload[0].payload;
            return (
                <div className="bg-slate-800 border border-slate-700 p-3 rounded shadow-lg text-xs">
                    <p className="font-bold text-slate-200 mb-1">{item.username}</p>
                    <p className="text-slate-400">Before: {item.avg_trades_before.toFixed(2)} 回/日</p>
                    <p className="text-slate-400">After: {item.avg_trades_after.toFixed(2)} 回/日</p>
                    <p className={`font-mono mt-1 ${item.change_percentage < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        变化率: {item.change_percentage > 0 ? '+' : ''}{item.change_percentage}%
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-[400px] bg-slate-900/50 rounded-xl border border-slate-800 p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-4">学習前後の取引頻度変化 (回/日)</h3>
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                    margin={{
                        top: 20,
                        right: 20,
                        bottom: 20,
                        left: 20,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis
                        type="number"
                        dataKey="avg_trades_before"
                        name="Before"
                        stroke="#94a3b8"
                        fontSize={12}
                        label={{ value: '学習前 (Before)', position: 'bottom', offset: 0, fill: '#94a3b8', fontSize: 12 }}
                    />
                    <YAxis
                        type="number"
                        dataKey="avg_trades_after"
                        name="After"
                        stroke="#94a3b8"
                        fontSize={12}
                        label={{ value: '学習後 (After)', angle: -90, position: 'left', fill: '#94a3b8', fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                    {/* Reference line for x=y (no change) */}
                    <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 20, y: 20 }]} stroke="#64748b" strokeDasharray="3 3" />
                    <Scatter name="Users" data={data} fill="#8884d8">
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.change_percentage < 0 ? '#10b981' : (entry.change_percentage > 0 ? '#f43f5e' : '#94a3b8')}
                            />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
};
