import { Play, FileText, ExternalLink } from "lucide-react";
import type { Lecture } from "../types/database.types";

export interface ContinueLectureCardProps {
  lecture: Lecture;
  onClick: () => void;
  onExternalOpen?: (url: string, lectureId: string, lectureTitle: string) => void;
}

function getButtonText(lecture: Lecture, progress: number): string {
  if (lecture.content_type === "video") {
    return progress > 0 ? "続きから再生" : "視聴する";
  }
  if (lecture.content_type === "pdf") return "PDFを開く";
  return "記事を読む";
}

function getIcon(lecture: Lecture) {
  const baseClass = "w-5 h-5 sm:w-6 sm:h-6 text-zinc-600";
  if (lecture.content_type === "pdf") return <FileText className={baseClass} />;
  if (lecture.content_type === "article") return <ExternalLink className={baseClass} />;
  return <Play className={`${baseClass} ml-0.5`} />;
}

export function ContinueLectureCard({ lecture, onClick, onExternalOpen }: ContinueLectureCardProps) {
  const note = lecture.lecture_notes;
  const progress = note?.watch_progress ?? 0;
  const isVideo = lecture.content_type === "video";

  const handleClick = () => {
    if (lecture.content_type === "video") {
      onClick();
      return;
    }
    const url = lecture.content_type === "pdf" ? lecture.slide_url : lecture.external_url;
    if (url && onExternalOpen) {
      onExternalOpen(url, lecture.id, lecture.title);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full text-left bg-white rounded-lg p-3 sm:p-4 cursor-pointer hover:shadow-lg transition-all border-2 border-zinc-200 hover:border-blue-300 overflow-hidden"
    >
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-zinc-300 bg-zinc-50 text-zinc-600 flex items-center justify-center">
          {getIcon(lecture)}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="font-bold text-base sm:text-lg text-zinc-900 truncate">{lecture.title}</div>
          <div className="text-xs sm:text-sm text-zinc-600 flex items-center gap-2 sm:gap-3 mt-0.5 sm:mt-1">
            <span>⏱ {lecture.duration_minutes ?? "—"}分</span>
            {isVideo && progress > 0 && (
              <span className="text-blue-500 font-medium">進捗: {progress}%</span>
            )}
          </div>
        </div>
        <span className="shrink-0 text-sm text-zinc-500 font-medium">{getButtonText(lecture, progress)} →</span>
      </div>
      {isVideo && progress > 0 && progress < 100 && (
        <div className="w-full bg-zinc-200 rounded-full h-2 mt-3">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </button>
  );
}
