import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from "framer-motion";

export type NoTradeReason = {
    name: string;
    value: number;
    color: string;
};

const defaultData: NoTradeReason[] = [
    { name: '条件不一致で見送り', value: 50, color: '#3b82f6' }, // blue-500
    { name: '条件外でのエントリー', value: 20, color: '#ef4444' }, // red-500
    { name: 'なんとなく見送り', value: 30, color: '#10b981' }, // emerald-500
];

interface NoTradeChartProps {
    data?: NoTradeReason[];
    totalNoTradeRate?: number;
    successRateAfterLoss?: number;
}

export function NoTradeChart({ data = defaultData, totalNoTradeRate = 80, successRateAfterLoss = 75 }: NoTradeChartProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm"
        >
            <h3 className="text-lg font-semibold text-slate-100 mb-6">見送り (No Trade) の質</h3>

            <div className="h-[250px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                            itemStyle={{ color: '#f8fafc' }}
                        />
                    </PieChart>
                </ResponsiveContainer>

                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs text-slate-400">合計見送り率</span>
                    <span className="text-3xl font-bold text-slate-100">{totalNoTradeRate}%</span>
                </div>
            </div>

            <div className="mt-4 space-y-2">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: item.color }}
                            />
                            <span className="text-slate-300">{item.name}</span>
                        </div>
                        <span className="text-slate-400">{item.value}%</span>
                    </div>
                ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 text-center">
                <div className="text-sm text-slate-400 mb-1">連敗後見送り成功率</div>
                <div className="text-2xl font-bold text-emerald-400">{successRateAfterLoss}%</div>
            </div>
        </motion.div>
    );
}
