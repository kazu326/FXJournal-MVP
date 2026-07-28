import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Badge,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { haptics } from "../lib/haptics";

interface MyPageProps {
  level: number;
}

interface ComingSoonCardProps {
  icon: LucideIcon;
  label: string;
  testId: string;
}

export default function MyPage({ level }: MyPageProps) {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const handleOpenLearning = () => {
    haptics.light();
    navigate("/learning-contents");
  };

  return (
    <main data-testid="mypage" className="bg-[#F7F8FA]">
      <div className="mx-auto max-w-md space-y-4 px-4 pt-5">
        <section
          aria-labelledby="mypage-title"
          className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/80 to-violet-50 p-5 shadow-[0_14px_34px_-24px_rgba(37,99,235,0.65)]"
        >
          <div
            aria-hidden
            className="absolute -right-10 -top-12 size-32 rounded-full bg-blue-200/30 blur-2xl"
          />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                <Sparkles className="size-4" aria-hidden />
                My Page
              </div>
              <h1
                id="mypage-title"
                className="m-0 text-2xl font-black tracking-tight text-slate-900"
              >
                マイページ
              </h1>
              <p className="mb-0 mt-2 text-sm leading-relaxed text-slate-600">
                記録を続けながら、必要な学びへ進みましょう。
              </p>
            </div>

            <div
              data-testid="mypage-level"
              aria-label={`現在のレベル ${level}`}
              className="flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl border border-white/90 bg-white/90 shadow-sm"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Level
              </span>
              <span className="text-2xl font-black leading-none text-blue-600">
                {level}
              </span>
            </div>
          </div>
        </section>

        <section aria-labelledby="mypage-menu-title">
          <div className="mb-3 flex items-end justify-between gap-3 px-1">
            <div>
              <h2
                id="mypage-menu-title"
                className="m-0 text-lg font-bold text-slate-900"
              >
                メニュー
              </h2>
              <p className="mb-0 mt-1 text-xs text-slate-500">
                利用できる機能から順番に表示しています。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <motion.button
              type="button"
              data-testid="mypage-learning"
              onClick={handleOpenLearning}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              className="group relative flex min-h-[142px] flex-col items-start overflow-hidden rounded-2xl !border !border-blue-200 !bg-gradient-to-br !from-blue-600 !to-indigo-600 p-4 text-left !text-white shadow-lg shadow-blue-500/20 outline-none transition-[box-shadow,filter] hover:brightness-105 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-white/15">
                <BookOpen className="size-5" aria-hidden />
              </div>
              <span className="text-sm font-bold">学習コンテンツ</span>
              <span className="mt-1 text-[11px] leading-relaxed text-blue-100">
                FXの基礎と判断の軸を学ぶ
              </span>
              <span className="mt-auto flex items-center gap-1 pt-3 text-xs font-bold">
                開く
                <ArrowRight
                  className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden
                />
              </span>
            </motion.button>

            <ComingSoonCard
              icon={ChartNoAxesCombined}
              label="経済指標"
              testId="mypage-indicator"
            />
            <ComingSoonCard
              icon={Badge}
              label="バッジ一覧"
              testId="mypage-badges"
            />
            <ComingSoonCard
              icon={CalendarDays}
              label="カレンダー"
              testId="mypage-calendar"
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function ComingSoonCard({
  icon: Icon,
  label,
  testId,
}: ComingSoonCardProps) {
  return (
    <article
      data-testid={testId}
      aria-disabled="true"
      className="flex min-h-[142px] flex-col items-start rounded-2xl border border-slate-200 bg-white/75 p-4 text-left shadow-sm"
    >
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <Icon className="size-5" aria-hidden />
      </div>
      <h3 className="m-0 text-sm font-bold text-slate-700">{label}</h3>
      <p className="mb-0 mt-1 text-[11px] leading-relaxed text-slate-500">
        今後のアップデートで公開予定です
      </p>
      <span className="mt-auto rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
        準備中
      </span>
    </article>
  );
}
