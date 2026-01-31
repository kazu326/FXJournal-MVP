"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { LectureItem, type LectureStatus } from "./LectureItem";

export interface LectureForStep {
  id: string;
  title: string;
  duration_minutes?: number | null;
}

interface StepCardProps {
  stepNumber: number;
  title: string;
  icon: string;
  lectures: LectureForStep[];
  defaultExpanded?: boolean;
  getStatus?: (lectureId: string) => LectureStatus;
  onSelectLecture: (lectureId: string) => void;
}

export function StepCard({
  stepNumber: _stepNumber,
  title,
  icon,
  lectures,
  defaultExpanded = false,
  getStatus = () => "locked" as LectureStatus,
  onSelectLecture,
}: StepCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const completedCount = lectures.filter((l) => getStatus(l.id) === "completed").length;
  const total = lectures.length;
  const progressPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <div className="w-full rounded-xl glass-panel backdrop-blur-xl bg-white/80 p-6 transition-all duration-300">
      {/* ヘッダー: アイコン + タイトル + 進捗 + 折りたたみ */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 text-left"
      >
        <span className="text-2xl shrink-0" aria-hidden>
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-zinc-900 truncate">{title}</h2>
          <div className="mt-1.5 h-1.5 w-full max-w-[120px] rounded-full bg-zinc-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <span className="text-xs text-zinc-500 shrink-0">
          {completedCount}/{total}
        </span>
        {expanded ? (
          <ChevronUp className="size-5 text-zinc-500 shrink-0" />
        ) : (
          <ChevronDown className="size-5 text-zinc-500 shrink-0" />
        )}
      </button>

      {/* 講座リスト */}
      {expanded && (
        <div className="mt-4 space-y-1">
          {lectures.map((lecture) => (
            <LectureItem
              key={lecture.id}
              id={lecture.id}
              title={lecture.title}
              durationMinutes={lecture.duration_minutes ?? undefined}
              status={getStatus(lecture.id)}
              onSelect={() => onSelectLecture(lecture.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
