import { ArrowRight, ExternalLink, FileText, Play } from "lucide-react";
import { haptics } from "../lib/haptics";
import type { Lecture } from "../types/database.types";

export interface ContinueLectureCardProps {
  lecture: Lecture;
  onClick: () => void;
  onExternalOpen?: (
    url: string,
    lectureId: string,
    lectureTitle: string,
  ) => void;
}

function getActionLabel(lecture: Lecture, progress: number): string {
  if (lecture.content_type === "video") {
    return progress > 0 ? "続きから見る" : "講義を始める";
  }
  if (lecture.content_type === "pdf") return "PDFを開く";
  return "記事を読む";
}

function LectureTypeIcon({
  contentType,
}: {
  contentType: Lecture["content_type"];
}) {
  const iconClass = "size-5";

  if (contentType === "pdf") {
    return <FileText className={iconClass} aria-hidden />;
  }
  if (contentType === "article") {
    return <ExternalLink className={iconClass} aria-hidden />;
  }
  return <Play className={`${iconClass} ml-0.5`} aria-hidden />;
}

export function ContinueLectureCard({
  lecture,
  onClick,
  onExternalOpen,
}: ContinueLectureCardProps) {
  const progress = lecture.lecture_notes?.watch_progress ?? 0;
  const isVideo = lecture.content_type === "video";
  const actionLabel = getActionLabel(lecture, progress);

  const handleClick = () => {
    haptics.light();

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

  return (
    <button
      type="button"
      data-testid="continue-lecture-card"
      onClick={handleClick}
      aria-label={`${actionLabel}: ${lecture.title}`}
      className="group !block w-full overflow-hidden rounded-2xl !border !border-blue-200 !bg-gradient-to-br !from-white !to-blue-50/80 p-4 text-left !text-slate-900 shadow-sm outline-none transition-[border-color,transform,box-shadow] hover:!border-blue-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
          <LectureTypeIcon contentType={lecture.content_type} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-blue-600">
            {progress > 0 && progress < 100 ? `進捗 ${progress}%` : "次の講義"}
          </span>
          <span className="mt-1 block text-base font-bold leading-snug text-slate-900 sm:text-lg">
            {lecture.title}
          </span>
          <span className="mt-1 block text-xs text-slate-500">
            約{lecture.duration_minutes ?? "—"}分
          </span>
        </span>
      </div>

      {isVideo && progress > 0 && progress < 100 ? (
        <span className="mt-4 block">
          <span className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-blue-700">
            <span>{actionLabel}</span>
            <span className="flex items-center gap-2">
              {progress}%
              <span className="flex size-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                <ArrowRight
                  className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden
                />
              </span>
            </span>
          </span>
          <span
            role="progressbar"
            aria-label={`${lecture.title}の視聴進捗`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="block h-1.5 overflow-hidden rounded-full bg-blue-100"
          >
            <span
              className="block h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </span>
        </span>
      ) : (
        <span className="mt-4 flex items-center justify-between text-xs font-bold text-blue-700">
          <span>{actionLabel}</span>
          <span className="flex size-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
            <ArrowRight
              className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
              aria-hidden
            />
          </span>
        </span>
      )}
    </button>
  );
}
