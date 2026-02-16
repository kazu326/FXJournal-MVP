import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";
import { cn } from "../../../lib/utils";

type DashboardSummaryCardProps = {
    title: string;
    value: string | number;
    subValue?: string;
    subLabel?: string;
    trend?: "up" | "down" | "neutral";
    trendValue?: string;
    icon: LucideIcon;
    color: "emerald" | "blue" | "amber" | "rose" | "purple";
    dalay?: number;
    onClick?: () => void;
    userIds?: string[];
    severity?: 'info' | 'warning' | 'danger';
    clickable?: boolean;
};

const colors = {
    emerald: {
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
        text: "text-emerald-500",
        iconBg: "bg-emerald-500/20",
    },
    blue: {
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
        text: "text-blue-500",
        iconBg: "bg-blue-500/20",
    },
    amber: {
        bg: "bg-amber-500/10",
        border: "border-amber-500/20",
        text: "text-amber-500",
        iconBg: "bg-amber-500/20",
    },
    rose: {
        bg: "bg-rose-500/10",
        border: "border-rose-500/20",
        text: "text-rose-500",
        iconBg: "bg-rose-500/20",
    },
    purple: {
        bg: "bg-purple-500/10",
        border: "border-purple-500/20",
        text: "text-purple-500",
        iconBg: "bg-purple-500/20",
    },
};

export function DashboardSummaryCard({
    title,
    value,
    subValue,
    subLabel,
    trend,
    trendValue,
    icon: Icon,
    color,
    dalay = 0,
    onClick,
    userIds,
    severity = 'info',
    clickable = true,
    className,
}: DashboardSummaryCardProps & { className?: string }) {
    const theme = colors[color];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: dalay }}
            whileHover={clickable ? { scale: 1.05 } : {}}
            whileTap={clickable ? { scale: 0.98 } : {}}
            onClick={onClick}
            className={cn(
                "relative overflow-hidden rounded-xl border p-6 backdrop-blur-sm transition-transform",
                theme.border,
                theme.bg,
                clickable && "cursor-pointer hover:scale-105",
                severity === 'danger' && "ring-2 ring-red-500",
                severity === 'warning' && "ring-2 ring-yellow-500",
                className
            )}
        >
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Icon className={`w-24 h-24 ${theme.text}`} />
            </div>

            {/* ユーザー数バッジ */}
            {userIds && userIds.length > 0 && (
                <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full z-20">
                    {userIds.length}名
                </div>
            )}

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg ${theme.iconBg}`}>
                        <Icon className={`w-6 h-6 ${theme.text}`} />
                    </div>
                    {trend && (
                        <div
                            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trend === "up"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : trend === "down"
                                    ? "bg-rose-500/10 text-rose-400"
                                    : "bg-slate-500/10 text-slate-400"
                                }`}
                        >
                            {trend === "up" ? (
                                <ArrowUpRight className="w-3 h-3" />
                            ) : trend === "down" ? (
                                <ArrowDownRight className="w-3 h-3" />
                            ) : null}
                            {trendValue}
                        </div>
                    )}
                </div>

                <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-1">{title}</h3>
                    <div className="text-3xl font-bold text-slate-100 tracking-tight">
                        {value}
                    </div>
                    {(subValue || subLabel) && (
                        <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
                            <span className="font-medium text-slate-400">{subValue}</span>
                            <span>{subLabel}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* クリック可能インジケーター */}
            {clickable && (
                <div className="absolute bottom-2 right-2 text-slate-500/50 text-xs opacity-0 hover:opacity-100 transition-opacity">
                    クリックして詳細 →
                </div>
            )}
        </motion.div>
    );
}
