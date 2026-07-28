import {
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Circle,
  Lock,
  Play,
} from "lucide-react";
import { haptics } from "../lib/haptics";
import type { Lecture, LectureStatus } from "../types/database.types";

export interface LectureSequenceItemProps {
  lecture: Lecture;
  sequenceNumber: number;
  status: LectureStatus;
  isLocked: boolean;
  onClick: () => void;
  onExternalOpen?: (
    url: string,
    lectureId: string,
    lectureTitle: string,
  ) => void;
  onMarkComplete?: (lectureId: string) => void;
  onLockedClick?: (lecture: Lecture) => void;
}

function getTypeLabel(contentType: Lecture["content_type"]): string {
  switch (contentType) {
    case "video":
      return "動画";
    case "pdf":
      return "PDF";
    case "article":
      return "記事";
  }
}

function getStatusLabel(
  status: LectureStatus,
  isLocked: boolean,
  progress: number,
): string {
  if (isLocked) return "ロック中";
  if (status === "completed") return "完了";
  if (status === "in_progress") return `学習中 ${progress}%`;
  return "未開始";
}

function StatusIcon({
  status,
  isLocked,
}: {
  status: LectureStatus;
  isLocked: boolean;
}) {
  if (isLocked) return <Lock className="size-4" aria-hidden />;
  if (status === "completed") {
    return <CheckCircle2 className="size-5" aria-hidden />;
  }
  if (status === "in_progress") return <Play className="size-4" aria-hidden />;
  return <Circle className="size-4" aria-hidden />;
}

export function LectureSequenceItem({
  lecture,
  sequenceNumber,
  status,
  isLocked,
  onClick,
  onExternalOpen,
  onMarkComplete,
  onLockedClick,
}: LectureSequenceItemProps) {
  const progress = lecture.lecture_notes?.watch_progress ?? 0;
  const isVideo = lecture.content_type === "video";
  const isExternal =
    lecture.content_type === "pdf" || lecture.content_type === "article";
  const showMarkComplete = isExternal && status !== "completed" && !isLocked;
  const statusLabel = getStatusLabel(status, isLocked, progress);
  const titleLabel =
    sequenceNumber === 0 ? "序章" : `第${sequenceNumber}回`;

  const handleClick = () => {
    haptics.light();

    if (isLocked) {
      onLockedClick?.(lecture);
      return;
    }
    if (lecture.content_type === "video") {
      onClick();
      return;
    }

    const url =
      lecture.content_type === "pdf"
        ? lecture.slide_url
        : lecture.external_url;
    if (url && onExternalOpen) {
      onExternalOpen(url, lecture.id, lecture.title);
    }
  };

  const handleMarkComplete = () => {
    haptics.light();
    onMarkComplete?.(lecture.id);
  };

  const itemTone = isLocked
    ? "border-slate-200 bg-slate-50 text-slate-500"
    : status === "completed"
      ? "border-emerald-100 bg-emerald-50/50 text-emerald-700"
      : status === "in_progress"
        ? "border-blue-200 bg-blue-50/70 text-blue-700"
        : "border-slate-200 bg-white text-slate-500";

  return (
    <article
      data-testid="lecture-item"
      data-status={isLocked ? "locked" : status}
      className={`overflow-hidden rounded-xl border ${itemTone}`}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label={`${titleLabel} ${lecture.title}、${statusLabel}`}
        className="group flex w-full items-center gap-3 !border-0 !bg-transparent px-3.5 py-3 text-left !text-inherit outline-none transition-colors hover:bg-white/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 motion-reduce:transition-none"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
          <StatusIcon status={status} isLocked={isLocked} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
              {titleLabel}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isLocked
                  ? "bg-slate-200 text-slate-600"
                  : status === "completed"
                    ? "bg-emerald-100 text-emerald-700"
                    : status === "in_progress"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-600"
              }`}
            >
              {statusLabel}
            </span>
          </span>
          <span className="mt-1 block truncate text-sm font-bold text-slate-800">
            {lecture.title}
          </span>
          <span className="mt-1 block text-[11px] text-slate-500">
            {getTypeLabel(lecture.content_type)} ・ 約
            {lecture.duration_minutes ?? "—"}分
          </span>
        </span>

        {isExternal && !isLocked ? (
          <ArrowUpRight className="size-4 shrink-0" aria-hidden />
        ) : (
          <ChevronRight
            className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden
          />
        )}
      </button>

      {isLocked ? (
        <p className="m-0 border-t border-slate-200 px-3.5 py-2 text-[11px] leading-relaxed text-slate-500">
          ひとつ前の講義を完了すると開きます
        </p>
      ) : null}

      {showMarkComplete ? (
        <div className="border-t border-current/10 px-3.5 py-2.5">
          <button
            type="button"
            onClick={handleMarkComplete}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg !border !border-emerald-200 !bg-emerald-50 px-3 py-2 text-xs font-bold !text-emerald-700 outline-none transition-colors hover:!bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 motion-reduce:transition-none"
          >
            <CheckCircle2 className="size-4" aria-hidden />
            確認後に完了へ
          </button>
        </div>
      ) : null}

      {isVideo && progress > 0 && progress < 100 ? (
        <div className="px-3.5 pb-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}
    </article>
  );
}
