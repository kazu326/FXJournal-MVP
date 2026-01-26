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
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center size-10 rounded-full bg-orange-100">
          <Flame className="size-6 text-orange-500" />
        </div>
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold leading-none text-foreground">{streakDays}</span>
            <span className="text-sm text-muted-foreground">日連続</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Zap className="size-5 text-primary" />
          <span className="text-xl font-semibold text-foreground">
            {currentXP}/{nextLevelXP} XP
          </span>
        </div>
        <div
          className="flex items-center justify-center size-10 rounded-full bg-primary font-bold text-sm"
          style={{ color: "var(--color-bg)" }}
        >
          Lv.{level}
        </div>
      </div>
    </div>
  );
}
