import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from "framer-motion";

export type RiskAlertData = {
    lotData: { day: string; count: number }[];
    revengeData: { day: string; count: number }[];
    lotIncreaseCount: number;
    revengeTradeCount: number;
};

const defaultLotData = [
    { day: 'Mon', count: 2 },
    { day: 'Tue', count: 5 },
    { day: 'Wed', count: 3 },
    { day: 'Thu', count: 4 },
    { day: 'Fri', count: 1 },
];

const defaultRevengeData = [
    { day: 'Mon', count: 1 },
    { day: 'Tue', count: 0 },
    { day: 'Wed', count: 2 },
    { day: 'Thu', count: 1 },
    { day: 'Fri', count: 0 },
];

const defaultData: RiskAlertData = {
    lotData: defaultLotData,
    revengeData: defaultRevengeData,
    lotIncreaseCount: 5,
    revengeTradeCount: 2
};

interface RiskAlertChartProps {
    data?: RiskAlertData;
}

export function RiskAlertChart({ data = defaultData }: RiskAlertChartProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm"
        >
            <h3 className="text-lg font-semibold text-slate-100 mb-4">危険行動アラート (週間)</h3>

            <div className="grid grid-cols-2 gap-4">
                {/* Rapid Lot Increase */}
                <div className="p-4 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                    <div className="flex justify-between items-start mb-2">
                        <div className="text-xs text-emerald-400">ロット急増</div>
                        <div className="text-xs text-emerald-500 font-bold bg-emerald-500/10 px-1 rounded">↓-2</div>
                    </div>
                    <div className="text-2xl font-bold text-slate-100 mb-2">{data.lotIncreaseCount}回</div>
                    <div className="h-[60px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.lotData}>
                                <Tooltip cursor={false} content={() => null} />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#10b981"
                                    fill="#10b981"
                                    fillOpacity={0.2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Revenge Trade */}
                <div className="p-4 bg-rose-500/5 rounded-lg border border-rose-500/10">
                    <div className="flex justify-between items-start mb-2">
                        <div className="text-xs text-rose-400">連敗後すぐエントリー</div>
                        <div className="text-xs text-rose-500 font-bold bg-rose-500/10 px-1 rounded">↓-1</div>
                    </div>
                    <div className="text-2xl font-bold text-slate-100 mb-2">{data.revengeTradeCount}回</div>
                    <div className="h-[60px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.revengeData}>
                                <Tooltip cursor={false} content={() => null} />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#f43f5e"
                                    fill="#f43f5e"
                                    fillOpacity={0.2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
