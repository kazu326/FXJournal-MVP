"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ClipboardCheck,
  ListChecks,
  ShieldCheck,
} from "lucide-react";
import { haptics } from "../lib/haptics";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

export type HomeNavigatorMode = "normal" | "pending" | "locked" | "completed";

type NavigatorAction = "guide" | "learning";
type NavigatorMascot = "greeting" | "thinking" | "thumbs-up";

type NavigatorMessage = {
  id: string;
  text: string;
  mascot: NavigatorMascot;
  action?: NavigatorAction;
};

interface HomeNavigatorProps {
  mode: HomeNavigatorMode;
  onOpenLearning: () => void;
}

const AUTO_ROTATE_MS = 6_000;
const TAP_RESET_MS = 8_000;
const REACTION_MS = 3_000;

const GUIDE_MESSAGE: NavigatorMessage = {
  id: "guide",
  text: "記録のつけ方に迷ったら、使い方ガイドを見てね。",
  mascot: "thinking",
  action: "guide",
};

const LEARNING_MESSAGE: NavigatorMessage = {
  id: "learning",
  text: "基礎から学びたいときは、学習コンテンツもあります。",
  mascot: "thumbs-up",
  action: "learning",
};

const MESSAGES_BY_MODE: Record<HomeNavigatorMode, NavigatorMessage[]> = {
  normal: [
    {
      id: "pre-trade",
      text: "取引前30秒の記録は、判断の根拠を残すための時間です。",
      mascot: "greeting",
    },
    {
      id: "skip",
      text: "チャンスがない日は、見送りも立派な記録になります。",
      mascot: "thinking",
    },
    GUIDE_MESSAGE,
    LEARNING_MESSAGE,
  ],
  pending: [
    {
      id: "pending",
      text: "取引後の振り返りは、結果より事実を短く残せば大丈夫です。",
      mascot: "thinking",
    },
    GUIDE_MESSAGE,
    LEARNING_MESSAGE,
  ],
  locked: [
    {
      id: "locked",
      text: "今日は上限に達しています。次の機会まで、見送りや学びを記録できます。",
      mascot: "thinking",
    },
    GUIDE_MESSAGE,
    LEARNING_MESSAGE,
  ],
  completed: [
    {
      id: "completed",
      text: "今日の記録は完了です。慎重な判断、おつかれさまでした。",
      mascot: "thumbs-up",
    },
    GUIDE_MESSAGE,
    LEARNING_MESSAGE,
  ],
};

const REACTION_MESSAGES: Record<3 | 6, NavigatorMessage> = {
  3: {
    id: "ticklish",
    text: "くすぐったいな…",
    mascot: "greeting",
  },
  6: {
    id: "shy",
    text: "そんなにたくさん触られると、ちょっと恥ずかしいな…",
    mascot: "greeting",
  },
};

export function HomeNavigator({
  mode,
  onOpenLearning,
}: HomeNavigatorProps) {
  const shouldReduceMotion = useReducedMotion();
  const messages = MESSAGES_BY_MODE[mode];
  const [messageIndex, setMessageIndex] = useState(0);
  const [reaction, setReaction] = useState<NavigatorMessage | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const tapCountRef = useRef(0);
  const tapResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (shouldReduceMotion || reaction || guideOpen) return;

    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % messages.length);
    }, AUTO_ROTATE_MS);

    return () => window.clearInterval(interval);
  }, [guideOpen, messages.length, reaction, shouldReduceMotion]);

  useEffect(
    () => () => {
      if (tapResetTimerRef.current) {
        window.clearTimeout(tapResetTimerRef.current);
      }
      if (reactionTimerRef.current) {
        window.clearTimeout(reactionTimerRef.current);
      }
    },
    [],
  );

  const showReaction = (tapCount: 3 | 6) => {
    if (reactionTimerRef.current) {
      window.clearTimeout(reactionTimerRef.current);
    }
    setReaction(REACTION_MESSAGES[tapCount]);
    reactionTimerRef.current = window.setTimeout(() => {
      setReaction(null);
    }, REACTION_MS);
  };

  const handleMascotTap = () => {
    haptics.light();

    tapCountRef.current += 1;
    const tapCount = tapCountRef.current;

    if (tapResetTimerRef.current) {
      window.clearTimeout(tapResetTimerRef.current);
    }
    tapResetTimerRef.current = window.setTimeout(() => {
      tapCountRef.current = 0;
    }, TAP_RESET_MS);

    if (tapCount === 3 || tapCount === 6) {
      showReaction(tapCount);
      return;
    }

    setReaction(null);
    setMessageIndex((current) => (current + 1) % messages.length);
  };

  const handleMessageAction = (action: NavigatorAction) => {
    haptics.light();
    if (action === "guide") {
      setGuideOpen(true);
      return;
    }
    onOpenLearning();
  };

  const currentMessage =
    reaction ?? messages[messageIndex % messages.length];
  const actionLabel =
    currentMessage.action === "guide"
      ? "記録のつけ方を見る"
      : "学習コンテンツを見る";

  return (
    <>
      <section
        data-testid="home-navigator"
        aria-label="ホームナビゲーター"
        className="mx-auto flex min-h-[148px] w-full items-end gap-2 px-1 py-1"
      >
        <motion.button
          type="button"
          data-testid="home-navigator-mascot"
          onClick={handleMascotTap}
          aria-label="マスコットをタップして次の案内を見る"
          aria-describedby="home-navigator-message"
          whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
          className="relative flex h-[112px] w-[98px] shrink-0 items-end justify-center !border-0 !bg-transparent !p-0 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:active:scale-100 motion-reduce:transition-none"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.img
              key={`${currentMessage.id}-${currentMessage.mascot}`}
              src={`/animations/${currentMessage.mascot}.png`}
              alt=""
              className="h-[104px] w-[104px] object-contain drop-shadow-[0_10px_12px_rgba(37,99,235,0.15)]"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
              animate={
                shouldReduceMotion
                  ? { opacity: 1 }
                  : reaction
                    ? { opacity: 1, y: 0, rotate: [0, -4, 4, -2, 0] }
                    : { opacity: 1, y: 0, rotate: 0 }
              }
              exit={shouldReduceMotion ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.24 }}
            />
          </AnimatePresence>
        </motion.button>

        <div className="relative min-w-0 flex-1 self-start pt-2">
          <div
            aria-hidden
            className="absolute left-[-7px] top-10 h-4 w-4 rotate-45 border-b border-l border-blue-100 bg-white/95"
          />
          <div className="relative flex min-h-[108px] flex-col justify-between rounded-2xl border border-blue-100 bg-white/95 px-3 py-3 shadow-[0_12px_28px_-20px_rgba(37,99,235,0.65)]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={currentMessage.id}
                id="home-navigator-message"
                data-testid="home-navigator-message"
                className="m-0 pr-0 text-[13px] font-semibold leading-relaxed text-slate-700"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
              >
                {currentMessage.text}
              </motion.p>
            </AnimatePresence>

            <div className="mt-2 flex min-h-9 items-end justify-between gap-2">
              <div className="flex gap-1.5" aria-hidden>
                {messages.map((message, index) => (
                  <span
                    key={message.id}
                    className={`h-1.5 rounded-full transition-[width,background-color] motion-reduce:transition-none ${
                      !reaction && index === messageIndex
                        ? "w-4 bg-blue-500"
                        : "w-1.5 bg-blue-200"
                    }`}
                  />
                ))}
              </div>

              {currentMessage.action ? (
                <button
                  type="button"
                  data-testid={`home-navigator-${currentMessage.action}-action`}
                  onClick={() => handleMessageAction(currentMessage.action!)}
                  aria-label={actionLabel}
                  className="flex size-9 min-h-9 shrink-0 items-center justify-center rounded-full !border-0 !bg-blue-600 !p-0 !text-white shadow-md shadow-blue-500/25 transition-[background-color,box-shadow] hover:!bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:active:scale-100 motion-reduce:transition-none"
                >
                  <ArrowRight className="size-4" strokeWidth={2.5} />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent
          data-testid="home-guide-dialog"
          className="w-[calc(100%-32px)] max-w-sm rounded-2xl border-blue-100 bg-white p-5 motion-reduce:data-[state=closed]:animate-none motion-reduce:data-[state=open]:animate-none"
        >
          <DialogHeader className="pr-6 text-left">
            <DialogTitle className="text-xl text-slate-900">
              記録のつけ方
            </DialogTitle>
            <DialogDescription className="leading-relaxed">
              完璧に書く必要はありません。判断の根拠と事実を短く残しましょう。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <GuideItem
              icon={<ClipboardCheck className="size-4" />}
              title="取引前（30秒）"
              description="取引前に、リスク・損切り・利確・ルール・仮説を確認し、判断の根拠を短く残します。"
            />
            <GuideItem
              icon={<ShieldCheck className="size-4" />}
              title="見送り（15秒）"
              description="チャンスがない、またはルールを満たさない日は見送りを記録します。取引しない判断も学習ログです。"
            />
            <GuideItem
              icon={<ListChecks className="size-4" />}
              title="取引後（60秒）"
              description="結果より、ルールを守れたか・想定内だったかを事実ベースで振り返ります。"
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <button
                type="button"
                className="w-full rounded-xl !border-0 !bg-slate-800 px-4 py-3 !text-white hover:!bg-slate-900 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
              >
                閉じる
              </button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function GuideItem({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
      <div className="mb-1 flex items-center gap-2 font-bold text-slate-800">
        <span className="text-blue-600">{icon}</span>
        <h3 className="m-0 text-sm">{title}</h3>
      </div>
      <p className="m-0 text-xs leading-relaxed text-slate-600">
        {description}
      </p>
    </div>
  );
}
