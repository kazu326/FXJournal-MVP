"use client";

import { useEffect } from "react";
import { Flame } from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { haptics } from "../lib/haptics";

interface StreakHeaderProps {
  streakDays: number;
  level: number;
  currentXP: number;
  nextLevelXP: number;
}

// 頂点上向きの六角形パス
const HEXAGON_PATH = "M50 4 L90 27 L90 73 L50 96 L10 73 L10 27 Z";

export function StreakHeader({
  streakDays = 5,
  level = 3,
  currentXP = 75,
  nextLevelXP = 100,
}: StreakHeaderProps) {
  const isLevelUp = nextLevelXP > 0 && currentXP >= nextLevelXP;
  // xpPercent は 0〜100 の範囲
  const displayXP = Math.min(currentXP, nextLevelXP || 1);
  const xpPercent = nextLevelXP > 0 ? (displayXP / nextLevelXP) * 100 : 0;

  useEffect(() => {
    if (isLevelUp) {
      // アニメーションが伸び終わる付近で紙吹雪を舞わせる
      const timer = setTimeout(() => {
        const duration = 2000;
        const end = Date.now() + duration;

        const frame = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.8 },
            colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff']
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.8 },
            colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff']
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        frame();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isLevelUp]);

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

      {/* Right: XP / Lv with Hexagon Progress */}
      <div className="flex-1 min-w-0 flex items-center justify-end gap-4">
        {/* XP Text */}
        <div className="flex flex-col items-end mt-1">
          <div className="flex items-baseline gap-1.5 text-slate-700 font-bold tabular-nums">
            <span className="text-2xl leading-none">{currentXP}</span>
            <span className="text-slate-400 text-sm font-semibold uppercase tracking-wider">XP</span>
          </div>
        </div>

        {/* Hexagon Indicator */}
        <div className="relative size-[64px] shrink-0 flex items-center justify-center flex-col">
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full overflow-visible">
            {/* Background Hexagon */}
            <path
              d={HEXAGON_PATH}
              fill="rgba(241, 245, 249, 0.5)"
              stroke="currentColor"
              strokeWidth="8"
              className="text-slate-200"
              strokeLinejoin="round"
            />
            {/* Foreground Animated Hexagon */}
            <motion.path
              d={HEXAGON_PATH}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={
                isLevelUp
                  ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]"
                  : "text-blue-500 drop-shadow-[0_0_4px_rgba(59,130,246,0.5)]"
              }
              initial={{ pathLength: 0 }}
              animate={{ pathLength: xpPercent / 100 }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              onAnimationComplete={() => {
                if (isLevelUp) {
                  haptics.success();
                } else if (xpPercent > 0) {
                  haptics.light();
                }
              }}
            />
          </svg>

          <div className="relative z-10 flex flex-col items-center justify-center mt-[-2px]">
            <span className="text-[10px] font-bold text-slate-400 leading-none mb-[2px]">Lv.</span>
            <span className={`text-2xl font-black leading-none ${isLevelUp ? 'text-yellow-600' : 'text-slate-700'}`}>
              {level}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
