"use client";

import { GlassCard as Card, CardContent } from "./ui/card";
import { AlertCircle, ArrowRight, Shield } from "lucide-react";

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
  return (
    <Card
      className={`relative overflow-hidden flex hero-card ${disabled ? "" : ""}`}
    >
      {/* 光る柱（左アクセントバー） */}
      <div
        className={`flex-shrink-0 w-2 self-stretch min-h-[120px] rounded-full ${
          disabled
            ? "bg-zinc-300"
            : "bg-gradient-to-b from-blue-400 via-blue-500 to-indigo-600 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
        }`}
      />
      <CardContent className="pt-6 pb-6 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className={`size-5 ${disabled ? "text-zinc-400" : "text-primary"}`} />
          <h2 className="text-lg font-bold text-slate-700">次にやること</h2>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          {description}
        </p>

        <div className="flex flex-col gap-4">
          {/* メインCTA: 鮮やかグラデーション・拡大アニメ・強化影 */}
          <button
            type="button"
            onClick={onAction}
            disabled={disabled}
            className={`w-full h-14 rounded-xl font-semibold text-base text-white inline-flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:transform-none ${
              disabled
                ? "bg-zinc-200 text-zinc-600 border border-zinc-300"
                : "bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 shadow-xl shadow-blue-500/40"
            }`}
          >
            {actionLabel}
            {!disabled && <ArrowRight className="size-5" />}
          </button>

          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onAction}
              className="w-full rounded-xl border border-green-200/80 bg-green-50/50 backdrop-blur-sm px-4 py-3.5 text-sm font-semibold !text-slate-800 shadow-sm hover:bg-green-50/70 hover:shadow active:scale-[0.98] transition-all inline-flex items-center justify-center gap-2"
            >
              <Shield className="h-4 w-4" />
              {secondaryAction.label}
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
