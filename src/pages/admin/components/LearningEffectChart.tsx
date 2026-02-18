import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Cell } from 'recharts';
import { motion } from "framer-motion";

interface LearningEffectProps {
    winRateBefore?: number;
    winRateAfter?: number;
}

export function LearningEffectChart({ winRateBefore = 40, winRateAfter = 60 }: LearningEffectProps) {
    const data = [
        { name: '受講前', winRate: winRateBefore },
        { name: '受講後', winRate: winRateAfter },
    ];
    const improvement = winRateAfter - winRateBefore;

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm"
        >
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-slate-100">学習効果 (受講前後比較)</h3>
                <span className="text-xs text-slate-400">Risk Management Course</span>
            </div>

            <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" barSize={30}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                        <XAxis type="number" hide domain={[0, 100]} />
                        <YAxis
                            type="category"
                            dataKey="name"
                            stroke="#94a3b8"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            width={50}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                            formatter={(value: any) => [`${value}%`, '勝率']}
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                        <ReferenceLine x={50} stroke="#64748b" strokeDasharray="3 3" />
                        <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
                            {data.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#94a3b8' : '#8b5cf6'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 flex justify-between text-xs text-slate-400 px-8">
                <div>Win Rate {winRateBefore}%</div>
                <div className="text-purple-400 font-bold">{improvement > 0 ? '+' : ''}{improvement}% Improved</div>
                <div>Win Rate {winRateAfter}%</div>
            </div>
        </motion.div>
    );
}
