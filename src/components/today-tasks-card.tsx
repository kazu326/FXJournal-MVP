"use client";

import { GlassCard as Card, CardContent } from "./ui/card";
import { Check, Circle, Sparkles } from "lucide-react";

export interface Task {
  id: string;
  label: string;
  completed: boolean;
  disabled?: boolean;
}

interface TodayTasksCardProps {
  tasks: Task[];
}

export function TodayTasksCard({ tasks }: TodayTasksCardProps) {
  const completedCount = tasks.filter((t) => t.completed).length;
  const allCompleted = completedCount === tasks.length;

  return (
    <Card className="relative overflow-hidden w-full rounded-2xl glass-panel backdrop-blur-xl">
      {allCompleted && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-2 right-2 flex items-center gap-1 text-primary animate-pulse">
            <Sparkles className="size-4" />
            <span className="text-xs font-medium">Complete!</span>
          </div>
        </div>
      )}
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-700">今日のタスク</h2>
          <span className="text-xs text-slate-500">
            {completedCount}/{tasks.length} 完了
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {tasks.map((task) => {
            const isCompleted = task.completed;
            const isDisabled = task.disabled ?? false;

            return (
              <div
                key={task.id}
                className={`
                  w-full h-11 flex items-center gap-3 px-3 rounded-xl border transition-all duration-300
                  ${isCompleted
                    ? "bg-primary/5 border-primary/10"
                    : "bg-white/80 border-slate-200/80"
                  }
                `}
              >
                <div
                  className={`flex items-center justify-center size-5 rounded-full transition-all duration-300 ${
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : "border-2 border-slate-300/50"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="size-3" />
                  ) : (
                    <Circle className="size-3 opacity-0" />
                  )}
                </div>
                <div className="min-w-0 text-left flex-1">
                  <div
                    className={`font-medium text-sm ${
                      isCompleted
                        ? "text-slate-500 line-through"
                        : isDisabled
                          ? "text-slate-400"
                          : "text-slate-700"
                    }`}
                  >
                    {task.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
