import { StreakHeader } from "./components/streak-header";
import { TodayTasksCard, Task } from "./components/today-tasks-card";
import { WeeklyProgressCard } from "./components/weekly-progress-card";
import { TeacherDMCard } from "./components/teacher-dm-card";
import { NextActionCard } from "./components/next-action-card";

interface FXJournalPageProps {
  streakDays?: number;
  level?: number;
  currentXP?: number;
  nextLevelXP?: number;
  tasks?: Task[];
  usedTrades?: number;
  maxTrades?: number;
  quote?: string;
  dmTimestamp?: string;
  dmMessage?: string;
  onSendReply?: (message: string) => void;
  pendingCount?: number;
  actionLabel?: string;
  onAction?: () => void;
}

const fallbackTasks: Task[] = [
  { id: "1", label: "取引前チェック", duration: "30秒", completed: true, xp: 10 },
  { id: "2", label: "取引後の振り返り", duration: "60秒", completed: false, xp: 15 },
  { id: "3", label: "日次まとめ", duration: "2分", completed: false, xp: 20 },
];

export default function FXJournalPage({
  streakDays = 5,
  level = 3,
  currentXP = 75,
  nextLevelXP = 100,
  tasks = fallbackTasks,
  usedTrades = 1,
  maxTrades = 2,
  quote = "トレードを「絞る」ことが最大の武器です。",
  dmTimestamp = "2026/1/20 22:06",
  dmMessage = "記録ありがとうございます。取引後のチェック（Step2）が未完のようです。\n\n結果ではなく\"想定内/外\"の判定だけでOKなので、1分で仕上げてください。",
  onSendReply,
  pendingCount = 1,
  actionLabel = "取引後 (60秒)",
  onAction,
}: FXJournalPageProps) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 py-6">
        <header className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">FX Journal</h1>
              <p className="text-sm text-muted-foreground">トレード記録 & 振り返り</p>
            </div>
          </div>
          <StreakHeader
            streakDays={streakDays}
            level={level}
            currentXP={currentXP}
            nextLevelXP={nextLevelXP}
          />
        </header>

        <div className="space-y-4">
          <NextActionCard pendingCount={pendingCount} actionLabel={actionLabel} onAction={onAction} />
          <TodayTasksCard tasks={tasks} />
          <WeeklyProgressCard usedTrades={usedTrades} maxTrades={maxTrades} quote={quote} />
          <TeacherDMCard timestamp={dmTimestamp} message={dmMessage} onSendReply={onSendReply} />
        </div>
      </div>
    </main>
  );
}
