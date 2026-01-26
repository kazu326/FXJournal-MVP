"use client";

import { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Check, Circle, ChevronRight, Sparkles } from "lucide-react";

export interface Task {
  id: string;
  label: string;
  duration: string;
  completed: boolean;
  xp: number;
}

interface TodayTasksCardProps {
  tasks: Task[];
  onTaskComplete?: (taskId: string) => void;
}

export function TodayTasksCard({ tasks: initialTasks, onTaskComplete }: TodayTasksCardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [celebratingId, setCelebratingId] = useState<string | null>(null);

  const completedCount = tasks.filter((t) => t.completed).length;
  const allCompleted = completedCount === tasks.length;

  const handleTaskClick = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task?.completed) return;

    setCelebratingId(taskId);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: true } : t))
    );
    onTaskComplete?.(taskId);

    setTimeout(() => setCelebratingId(null), 600);
  };

  return (
    <Card className="relative overflow-hidden">
      {allCompleted && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-2 right-2 flex items-center gap-1 text-primary animate-pulse">
            <Sparkles className="size-4" />
            <span className="text-xs font-medium">Complete!</span>
          </div>
        </div>
      )}
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">今日のタスク</h2>
          <span className="text-sm text-muted-foreground">
            {completedCount}/{tasks.length} 完了
          </span>
        </div>

        <div className="space-y-2">
          {tasks.map((task) => (
            <Button
              key={task.id}
              variant={task.completed ? "secondary" : "outline"}
              className={`w-full h-14 justify-start px-4 transition-all duration-300 ${
                task.completed
                  ? "bg-primary/10 border-primary/20"
                  : "hover:border-primary hover:bg-primary/5"
              } ${celebratingId === task.id ? "scale-95" : ""}`}
              onClick={() => handleTaskClick(task.id)}
              disabled={task.completed}
            >
              <div className="flex items-center gap-3 w-full">
                <div
                  className={`flex items-center justify-center size-6 rounded-full transition-all duration-300 ${
                    task.completed
                      ? "bg-primary text-primary-foreground"
                      : "border-2 border-muted-foreground/30"
                  }`}
                >
                  {task.completed ? (
                    <Check className="size-4" />
                  ) : (
                    <Circle className="size-4 opacity-0" />
                  )}
                </div>
                <div className="min-w-0 text-left">
                  <div
                    className={`font-medium ${
                      task.completed ? "text-muted-foreground line-through" : "text-foreground"
                    }`}
                  >
                    {task.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ({task.duration}) +{task.xp} XP
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {!task.completed && <ChevronRight className="size-4 text-muted-foreground" />}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
