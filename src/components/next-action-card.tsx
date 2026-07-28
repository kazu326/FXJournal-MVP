"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AlertCircle, ArrowRight, Shield } from "lucide-react";
import { haptics } from "../lib/haptics";
import { Card, CardContent } from "./ui/card";

interface NextActionCardProps {
  pendingCount?: number;
  actionLabel?: string;
  onAction?: () => void;
  description?: string;
  disabled?: boolean;
  secondaryAction?: {
    label: string;
    onAction: () => void;
  };
}

export function NextActionCard({
  actionLabel = "記録する",
  onAction,
  description,
  disabled = false,
  secondaryAction,
}: NextActionCardProps) {
  const shouldReduceMotion = useReducedMotion();

  const handlePrimaryAction = () => {
    if (disabled) return;
    haptics.light();
    onAction?.();
  };

  return (
    <Card className="hero-card relative flex w-full overflow-hidden rounded-2xl glass-panel backdrop-blur-xl">
      <div
        aria-hidden
        className={`w-1.5 shrink-0 self-stretch rounded-full ${
          disabled
            ? "bg-zinc-300"
            : "bg-gradient-to-b from-blue-400 via-blue-500 to-indigo-600 shadow-[0_0_16px_rgba(59,130,246,0.4)]"
        }`}
      />
      <CardContent className="min-w-0 flex-1 !px-4 !py-4">
        <div className="mb-2 flex items-center gap-2">
          <AlertCircle
            className={`size-4 ${disabled ? "text-zinc-400" : "text-primary"}`}
          />
          <h2 className="m-0 text-base font-bold text-slate-700">
            次にやること
          </h2>
        </div>

        {description ? (
          <p className="mb-3 text-sm leading-snug text-slate-500">
            {description}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <motion.button
            type="button"
            data-testid="next-action-primary"
            onClick={handlePrimaryAction}
            disabled={disabled}
            whileTap={
              disabled || shouldReduceMotion ? undefined : { scale: 0.985 }
            }
            className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl !border-0 text-sm font-semibold outline-none ring-0 transition-[filter,box-shadow,background-color] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:transform-none disabled:opacity-50 motion-reduce:active:scale-100 motion-reduce:transition-none ${
              disabled
                ? "!bg-zinc-200 !text-zinc-600"
                : "!bg-gradient-to-r !from-blue-600 !via-blue-500 !to-indigo-600 !text-white shadow-lg shadow-blue-500/30 hover:brightness-105"
            }`}
          >
            {actionLabel}
            {!disabled ? <ArrowRight className="size-4" /> : null}
          </motion.button>

          {secondaryAction ? (
            <button
              type="button"
              data-testid="next-action-secondary"
              onClick={secondaryAction.onAction}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-green-200/80 bg-green-50/50 px-4 py-2.5 text-sm font-semibold !text-slate-800 shadow-sm transition-[background-color,box-shadow] hover:bg-green-50/80 hover:shadow focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
            >
              <Shield className="h-4 w-4" />
              {secondaryAction.label}
            </button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
