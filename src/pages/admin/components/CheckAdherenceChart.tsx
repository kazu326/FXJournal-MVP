import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from "framer-motion";

export type AdherenceData = {
    week: string;
    rate: number;
};

const defaultData: AdherenceData[] = [
    { week: '0週', rate: 60 },
    { week: '1週', rate: 80 },
    { week: '2週', rate: 90 },
    { week: '3週', rate: 95 },
    { week: '4週', rate: 95 },
];

interface CheckAdherenceChartProps {
    data?: AdherenceData[];
    avgContinuityDays?: number;
}

export function CheckAdherenceChart({ data = defaultData, avgContinuityDays = 14 }: CheckAdherenceChartProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm"
        >
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-slate-100">30秒チェック定着度 (週次推移)</h3>
                <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                    取引前チェック実施率
                </span>
            </div>

            <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis
                            dataKey="week"
                            stroke="#94a3b8"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#94a3b8"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            unit="%"
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                            formatter={(value: any) => [`${value}%`, '実施率']}
                            labelFormatter={(label) => `${label}日`}
                        />
                        <Area
                            type="monotone"
                            dataKey="rate"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorRate)"
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 text-center">
                <div className="text-3xl font-bold text-slate-100">平均継続日数: {avgContinuityDays}日</div>
            </div>
        </motion.div>
    );
}
