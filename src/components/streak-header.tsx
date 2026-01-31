"use client";

import { Flame, Zap } from "lucide-react";

interface StreakHeaderProps {
  streakDays: number;
  level: number;
  currentXP: number;
  nextLevelXP: number;
}

export function StreakHeader({
  streakDays = 5,
  level = 3,
  currentXP = 75,
  nextLevelXP = 100,
}: StreakHeaderProps) {
  const xpPercent = nextLevelXP > 0 ? Math.min(100, (currentXP / nextLevelXP) * 100) : 0;

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Left: Streak with orange gradient icon */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/25">
          <Flame className="size-6 text-white" />
        </div>
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold leading-none text-slate-700">{streakDays}</span>
            <span className="text-sm text-slate-500">日連続</span>
          </div>
        </div>
      </div>

      {/* Right: XP / Lv with slim gradient progress bar */}
      <div className="flex-1 min-w-0 flex flex-col items-end gap-2">
        <div className="flex items-center gap-2 w-full justify-end">
          <Zap className="size-5 text-primary shrink-0" />
          <span className="text-lg font-semibold text-slate-700 tabular-nums">
            {currentXP}/{nextLevelXP} XP
          </span>
          <div className="flex items-center justify-center size-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 font-bold text-sm shadow-md shadow-blue-500/25 text-white">
            Lv.{level}
          </div>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.5)] transition-all duration-500"
            style={{ width: `${xpPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
