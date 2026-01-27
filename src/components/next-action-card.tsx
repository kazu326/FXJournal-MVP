"use client";

import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
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
    <Card className={`relative overflow-hidden border-l-4 ${disabled ? 'border-l-zinc-300' : 'border-l-primary'}`}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className={`size-5 ${disabled ? 'text-zinc-400' : 'text-primary'}`} />
          <h2 className="text-lg font-bold text-foreground">次にやること</h2>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          {description}
        </p>
        
        <div className="flex flex-col gap-2">
          <Button
            className="w-full h-12 text-base font-semibold transition-all text-[var(--color-bg)]"
            onClick={onAction}
            disabled={disabled}
            variant={disabled ? "outline" : "default"}
          >
            {actionLabel}
            {!disabled && <ArrowRight className="ml-2 size-4" />}
          </Button>

          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onAction}
              className="mt-3 w-full rounded-xl border-2 border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 active:bg-zinc-100 transition-colors inline-flex items-center justify-center gap-2"
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
