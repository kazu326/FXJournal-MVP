import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from "framer-motion";

const data = [
    { time: '0-4', count: 12 },
    { time: '4-8', count: 5 },
    { time: '8-12', count: 8 },
    { time: '12-16', count: 15 },
    { time: '16-20', count: 25 },
    { time: '20-24', count: 30 },
];

export function TimeZoneBiasChart() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm"
        >
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-slate-100">時間帯別トレード傾向</h3>
                <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">
                    深夜帯抑制傾向
                </span>
            </div>

            <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis
                            dataKey="time"
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
                        />
                        <Tooltip
                            cursor={{ fill: '#334155', opacity: 0.2 }}
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                            itemStyle={{ color: '#a78bfa' }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {data.map((_entry, index) => (
                                <Cell key={`cell - ${index} `} fill={`rgba(16, 185, 129, ${0.4 + (index % 5) * 0.1})`} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 flex justify-between items-center bg-slate-800/50 p-3 rounded-lg">
                <div className="text-xs text-slate-400">深夜帯 (20:00-04:00) 比率</div>
                <div className="text-xl font-bold text-slate-200">15%</div>
            </div>
        </motion.div>
    );
}
