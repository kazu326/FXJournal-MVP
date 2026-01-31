import { Lock, CheckCircle, Play, Circle } from "lucide-react";
import type { Lecture, LectureStatus } from "../types/database.types";

export interface LectureSequenceItemProps {
  lecture: Lecture;
  sequenceNumber: number;
  status: LectureStatus;
  isLocked: boolean;
  onClick: () => void;
  onExternalOpen?: (url: string, lectureId: string, lectureTitle: string) => void;
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
    default:
      return "";
  }
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
  const note = lecture.lecture_notes ?? null;
  const progress = note?.watch_progress ?? 0;
  const isVideo = lecture.content_type === "video";
  const isExternal = lecture.content_type === "pdf" || lecture.content_type === "article";
  const showMarkComplete = isExternal && status !== "completed" && !isLocked;

  const handleClick = () => {
    if (isLocked) {
      onLockedClick?.(lecture);
      return;
    }
    if (lecture.content_type === "video") {
      onClick();
      return;
    }
    const url = lecture.content_type === "pdf" ? lecture.slide_url : lecture.external_url;
    if (url && onExternalOpen) {
      onExternalOpen(url, lecture.id, lecture.title);
    }
  };

  const handleMarkComplete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMarkComplete?.(lecture.id);
  };

  const getStatusBadge = () => {
    if (status === "completed") {
      return (
        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium shrink-0">
          ✓ 完了
        </span>
      );
    }
    if (status === "in_progress" && isExternal) {
      return (
        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium shrink-0">
          📖 確認中
        </span>
      );
    }
    if (status === "in_progress" && isVideo) {
      return (
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium shrink-0">
          ▶ 視聴中 {progress}%
        </span>
      );
    }
    return null;
  };

  const Icon = () => {
    if (isLocked) return <Lock className="w-5 h-5 text-zinc-400" />;
    if (status === "completed") return <CheckCircle className="w-5 h-5 text-zinc-500" />;
    if (status === "in_progress") return <Play className="w-5 h-5 text-zinc-600" />;
    return <Circle className="w-5 h-5 text-zinc-300" />;
  };

  const titleLabel = sequenceNumber === 0 ? "序章" : `第${sequenceNumber}回`;

  const handleRowClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    handleClick();
  };

  return (
    <div
      role="button"
      tabIndex={isLocked ? -1 : 0}
      className={`
        p-4 rounded-lg border-2 transition-all
        ${isLocked
          ? "bg-zinc-50 border-zinc-200 cursor-pointer opacity-90 hover:bg-zinc-100"
          : "bg-white border-zinc-200 hover:border-blue-300 hover:shadow cursor-pointer"
        }
      `}
      onClick={handleRowClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0">
          <Icon />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-zinc-900 flex items-center gap-2 flex-wrap">
            <span className="min-w-0 truncate">
              {titleLabel}：{lecture.title}
            </span>
            {getStatusBadge()}
          </div>
          <div className="text-sm text-zinc-500 flex items-center gap-3 mt-1">
            <span>{getTypeLabel(lecture.content_type ?? "video")}</span>
            <span>⏱ {lecture.duration_minutes ?? "—"}分</span>
            {isVideo && progress > 0 && progress < 100 && (
              <span className="text-blue-600 font-medium">進捗: {progress}%</span>
            )}
          </div>
        </div>
      </div>

      {isLocked && (
        <div className="mt-2 text-xs text-zinc-500 flex items-center gap-1">
          <Lock className="w-3 h-3 shrink-0" />
          前の講座を完了するとアンロックされます
        </div>
      )}

      {showMarkComplete && (
        <button
          type="button"
          onClick={handleMarkComplete}
          className="mt-3 w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all font-medium flex items-center justify-center gap-2 cursor-pointer"
        >
          <CheckCircle className="w-4 h-4" />
          完了にする
        </button>
      )}

      {isVideo && progress > 0 && progress < 100 && (
        <div className="w-full bg-zinc-200 rounded-full h-2 mt-3">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
