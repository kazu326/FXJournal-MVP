"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import confetti from "canvas-confetti";

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
  const isLevelUp = nextLevelXP > 0 && currentXP >= nextLevelXP;

  // --- レベルからバッジ画像を決定するロジック ---
  const getBadgeImage = (lv: number) => {
    if (lv < 5) return "/badges/bronze-simple.png";
    if (lv < 10) return "/badges/silver-simple.png";
    if (lv < 15) return "/badges/gold-simple.png";
    if (lv < 20) return "/badges/bronze-laurel.png";
    if (lv < 25) return "/badges/silver-laurel.png";
    if (lv < 30) return "/badges/gold-laurel.png";
    return "/badges/legend.png";
  };

  const badgeSrc = getBadgeImage(level);
  const xpPercent = Math.min((currentXP / Math.max(nextLevelXP, 1)) * 100, 100);

  // カウントアップアニメーション用のMotionValue
  const countValue = useMotionValue(0);
  const roundedXP = useTransform(countValue, (latest) => Math.round(latest));

  useEffect(() => {
    // 画面表示時に0から現在のXPまでアニメーションする
    const controls = animate(countValue, currentXP, {
      type: "spring",
      stiffness: 60,
      damping: 12,
      delay: 0.2
    });
    return () => controls.stop();
  }, [currentXP, countValue]);

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
    <div
      className="relative w-full mx-auto rounded-[15px] sm:rounded-[20px] shadow-sm mt-6 overflow-hidden shrink-0 aspect-[600/270]"
      style={{
        backgroundImage: 'url(/background-image.png)',
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      }}
    >
      {/* ---------- コンテンツコンテナ ---------- */}
      {/* 
        背景画像(600x270 aspect ratio ~2.22)に対して、パーセンテージや絶対ピクセルで各要素を配置する
        親要素のminHeight: 175px (または高さをアスペクト比で固定) に応じて調整
      */}
      <div className="absolute inset-0 w-full h-full">

        {/* ---------- Left: Streak Text ---------- */}
        <div
          className="absolute flex items-center justify-center gap-[2px]"
          // 日数テキスト（"X 日連続"）
          style={{
            left: '4.5%', top: '65.6%',
            width: '24%', height: '14%'
          }}
        >
          <span className="text-[20px] sm:text-[28px] font-black text-slate-800 leading-none">{streakDays}</span>
          <span className="text-[12px] sm:text-[14px] font-bold text-slate-500 leading-none tracking-tighter">日連続</span>
        </div>

        {/* ---------- Center: Badge Image ---------- */}
        <div
          className="absolute flex items-center justify-center pointer-events-none"
          // 中央バッジ（ガイドの赤枠位置・盾アイコンの中心）
          style={{ left: '49%', top: '34%', transform: 'translate(-50%, -50%)', width: '32%', height: '70%' }}
        >
          <img
            src={badgeSrc}
            alt={`Lv${level} Badge`}
            className="w-full h-full object-contain drop-shadow-xl z-20"
          />
        </div>

        {/* ---------- Right: Lv, XP, Progress Bar ---------- */}
        {/* レベルテキスト (金文字) */}
        <div
          className="absolute flex items-center justify-center"
          // Lv.テキスト赤枠
          style={{
            left: '68.0%', top: '30.0%',
            width: '26%', height: '26%'
          }}
        >
          <span
            className="text-[44px] sm:text-[64px] font-black leading-none bg-clip-text text-transparent bg-gradient-to-b from-[#fcd34d] via-[#fbbf24] to-[#b45309]"
            style={{
              filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.4))",
              letterSpacing: "-0.02em"
            }}
          >
            Lv.{level}
          </span>
        </div>

        {/* XPテキスト (肉球アイコンは背景にあるため数字とXPのみ) */}
        <div
          className="absolute flex items-center justify-center gap-[4px]"
          // XPテキスト（"25/100 XP"）
          style={{
            left: '46.7%', top: '65.6%',
            width: '32%', height: '12%'
          }}
        >
          <motion.span className="text-[14px] sm:text-[18px] font-black text-white tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">{roundedXP}</motion.span>
          <span className="text-[12px] sm:text-[14px] font-bold text-white/90 drop-shadow-sm">/{nextLevelXP}</span>
          <span className="text-[10px] sm:text-[12px] font-black text-white drop-shadow-sm ml-1">XP</span>
        </div>

        {/* プログレスバー */}
        <div
          className="absolute"
          // XPバー（背景 + 進捗）の起点と全体の幅
          style={{ left: '39.2%', top: '78.5%', width: '55%' }}
        >
          {/* 約1.8倍に太く (h-[8px] -> 14px, sm:h-[12px] -> 22px) */}
          <div className="w-full h-[14px] sm:h-[22px] rounded-full bg-[#829bf9]/60 overflow-hidden shadow-inner flex justify-start pl-[2px] pr-[2px] items-center">
            <motion.div
              className="h-[10px] sm:h-[16px] rounded-full bg-gradient-to-r from-[#fb923c] to-[#fcd34d]"
              initial={{ width: 0 }}
              animate={{ width: `${xpPercent}%` }}
              transition={{ type: "spring", stiffness: 60, damping: 15 }}
              style={{
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
