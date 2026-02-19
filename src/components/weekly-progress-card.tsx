"use client";

import { GlassCard as Card, CardContent } from "./ui/card";
import { AlertTriangle, Shield, ShieldCheck, TrendingDown } from "lucide-react";

interface WeeklyProgressCardProps {
  usedTrades?: number;
  maxTrades?: number;
  quote?: string;
}

export function WeeklyProgressCard({
  usedTrades = 1,
  maxTrades = 2,
  quote = "トレードを「絞る」ことが最大の武器です。",
}: WeeklyProgressCardProps) {
  const remaining = maxTrades - usedTrades;
  const isOverTrading = usedTrades > maxTrades;
  const isAtLimit = usedTrades === maxTrades;
  const overCount = isOverTrading ? usedTrades - maxTrades : 0;

  const getStatusStyle = () => {
    if (isOverTrading) {
      return {
        card: "ring-2 ring-warning/50 bg-warning/5",
        icon: AlertTriangle,
        iconColor: "text-warning",
        badge: "bg-warning/10 text-warning-foreground",
      };
    }
    if (isAtLimit) {
      return {
        card: "ring-2 ring-success/30 bg-success/5",
        icon: ShieldCheck,
        iconColor: "text-success",
        badge: "bg-success/10 text-success-foreground",
      };
    }
    return {
      card: "",
      icon: Shield,
      iconColor: "text-primary",
      badge: "bg-primary/10 text-primary",
    };
  };

  const status = getStatusStyle();
  const StatusIcon = status.icon;

  return (
    <Card className={`w-full rounded-2xl glass-panel backdrop-blur-xl ${status.card}`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingDown className="size-6 text-primary" />
            <h2 className="text-lg font-bold text-slate-700">本日のトレード枠</h2>
          </div>
          <div className={`flex items-center justify-center size-8 rounded-full ${status.badge}`}>
            <StatusIcon className={`size-5 ${status.iconColor}`} />
          </div>
        </div>

        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          {quote}
        </p>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            {Array.from({ length: maxTrades }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-12 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${i < usedTrades
                    ? "bg-slate-200/80 text-slate-500"
                    : "bg-primary/15 text-primary"
                  }`}
              >
                {i < usedTrades ? "使用済" : "残り"}
              </div>
            ))}
          </div>

          {isOverTrading && (
            <div className="flex items-center gap-2 mt-2">
              {Array.from({ length: overCount }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-12 rounded-xl flex items-center justify-center font-bold text-sm bg-warning/20 text-warning-foreground border-2 border-warning/50"
                >
                  超過 {i + 1}
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className={`flex items-start gap-3 p-4 rounded-xl ${isOverTrading ? "bg-warning/10" : isAtLimit ? "bg-success/10" : "bg-slate-100/60"
            }`}
        >
          {isOverTrading ? (
            <>
              <AlertTriangle className="size-6 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-warning-foreground">過剰トレード警告</p>
                <p className="text-sm text-slate-500 mt-1">
                  1日{maxTrades}回の上限を{overCount}回超過しています。リベンジトレードになっていませんか？
                </p>
              </div>
            </>
          ) : isAtLimit ? (
            <>
              <ShieldCheck className="size-6 text-success shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-success-foreground">本日の枠を使い切りました</p>
                <p className="text-sm text-slate-500 mt-1">
                  素晴らしい自制心です。明日まで見送りに徹しましょう。
                </p>
              </div>
            </>
          ) : (
            <>
              <Shield className="size-6 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-700">残り {remaining} 回</p>
                <p className="text-sm text-slate-500 mt-1">
                  厳選したチャンスだけを狙いましょう。
                </p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
