"use client";

export type LectureStatus = "completed" | "in_progress" | "locked";

export interface LectureItemProps {
  id: string;
  title: string;
  durationMinutes?: number | null;
  status: LectureStatus;
  onSelect: () => void;
}

const statusConfig: Record<LectureStatus, { icon: string; label: string; className: string }> = {
  completed: { icon: "✅", label: "完了", className: "text-zinc-500" },
  in_progress: { icon: "▶", label: "視聴中", className: "text-blue-600" },
  locked: { icon: "🔒", label: "未開始", className: "text-zinc-400" },
};

export function LectureItem({ title, durationMinutes, status, onSelect }: LectureItemProps) {
  const config = statusConfig[status];
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left flex items-center gap-3 p-4 rounded-xl hover:bg-blue-50 transition-colors duration-300 cursor-pointer border border-transparent hover:border-blue-100"
    >
      <span className="text-lg shrink-0" aria-hidden>
        {config.icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-zinc-900 truncate">{title}</div>
        {durationMinutes != null && (
          <div className="text-xs text-zinc-500 mt-0.5">{durationMinutes}分</div>
        )}
      </div>
      <span className={`text-xs font-medium shrink-0 ${config.className}`}>{config.label}</span>
    </button>
  );
}
