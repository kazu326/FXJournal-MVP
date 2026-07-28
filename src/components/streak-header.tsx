"use client";

import { motion, useReducedMotion } from "framer-motion";
import { haptics } from "../lib/haptics";

interface StreakHeaderProps {
  streakDays: number;
  level: number;
  currentXP: number;
  nextLevelXP: number;
  onClick?: () => void;
}

export function StreakHeader({
  streakDays = 5,
  level = 3,
  currentXP = 75,
  nextLevelXP = 100,
  onClick,
}: StreakHeaderProps) {
  const shouldReduceMotion = useReducedMotion();
  const safeNextLevelXP = Math.max(nextLevelXP, 1);
  const xpPercent = Math.min(
    Math.max((currentXP / safeNextLevelXP) * 100, 0),
    100,
  );

  const handleClick = () => {
    haptics.light();
    onClick?.();
  };

  return (
    <motion.button
      type="button"
      data-testid="progress-card"
      onClick={handleClick}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
      aria-label={`マイページを見る。連続${streakDays}日、レベル${level}、${currentXP}/${nextLevelXP} XP`}
      className="group relative h-[106px] w-full overflow-hidden rounded-2xl !border !border-blue-100/90 !bg-gradient-to-br !from-white !via-blue-50/80 !to-indigo-50/90 !p-0 text-left shadow-[0_12px_30px_-18px_rgba(37,99,235,0.65)] outline-none transition-[border-color,box-shadow,background-color] hover:!border-blue-200 hover:!bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:active:scale-100 motion-reduce:transition-none"
    >
      <div className="flex h-full flex-col justify-between px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="m-0 text-[11px] font-bold tracking-wide text-slate-500">
              連続記録
            </p>
            <p className="m-0 mt-0.5 text-xl font-black leading-none text-slate-900">
              {streakDays}
              <span className="ml-1 text-xs font-bold text-slate-500">日</span>
            </p>
          </div>

          <div className="text-right">
            <p className="m-0 text-[11px] font-bold tracking-wide text-slate-500">
              レベル
            </p>
            <p className="m-0 mt-0.5 text-xl font-black leading-none text-blue-700">
              Lv.{level}
            </p>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold text-slate-600">
              {currentXP}/{nextLevelXP} XP
            </span>
            <span className="text-[11px] font-bold text-blue-700 group-hover:text-blue-800">
              マイページを見る →
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-blue-100"
            role="progressbar"
            aria-label="次のレベルまでのXP"
            aria-valuemin={0}
            aria-valuemax={nextLevelXP}
            aria-valuenow={Math.min(Math.max(currentXP, 0), nextLevelXP)}
          >
            <motion.div
              data-testid="xp-progress-fill"
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
              initial={shouldReduceMotion ? false : { width: 0 }}
              animate={{ width: `${xpPercent}%` }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
              }
            />
          </div>
        </div>
      </div>
    </motion.button>
  );
}
