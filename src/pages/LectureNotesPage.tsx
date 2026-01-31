import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { ArrowLeft, BookOpen, PlayCircle } from "lucide-react";
import { LectureSequenceItem } from "../components/LectureSequenceItem";
import { ContinueLectureCard } from "../components/ContinueLectureCard";
import { LectureDetailModal } from "../components/LectureDetailModal";
import type { Course, Lecture, LectureStatus } from "../types/database.types";

interface LectureNotesPageProps {
  session: { user?: { id: string } } | null;
  onBack: () => void;
  onLectureComplete?: (res: unknown) => void;
}

function getLectureStatus(lecture: Lecture): LectureStatus {
  const note = lecture.lecture_notes;
  if (!note) return "not_started";
  if (note.completed_at != null || (note.watch_progress ?? 0) >= 70) return "completed";
  if ((note.watch_progress ?? 0) > 0) return "in_progress";
  return "not_started";
}

function isLectureUnlocked(lecture: Lecture, lectures: Lecture[]): boolean {
  const courseLectures = lectures.filter((l) => l.course_id === lecture.course_id);
  if (lecture.sequence_number === 0 || lecture.sequence_number === 1) return true;
  const prevLecture = courseLectures.find((l) => l.sequence_number === lecture.sequence_number - 1);
  if (!prevLecture) return true;
  const prevNote = prevLecture.lecture_notes;
  return prevNote?.completed_at != null || (prevNote?.watch_progress ?? 0) >= 70;
}

export default function LectureNotesPage({ session, onBack, onLectureComplete }: LectureNotesPageProps) {
  const user = session?.user;
  const [courses, setCourses] = useState<Course[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [selectedLectureId, setSelectedLectureId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [coursesRes, lecturesRes, notesRes] = await Promise.all([
        supabase.from("courses").select("*").order("sequence_number", { ascending: true }),
        supabase.from("lectures").select("*").order("sequence_number", { ascending: true }),
        supabase.from("lecture_notes").select("lecture_id, watch_progress, completed_at").eq("user_id", user.id),
      ]);

      const coursesData = (coursesRes.data as Course[]) ?? [];
      const lecturesData = (lecturesRes.data as Lecture[]) ?? [];
      const notesMap: Record<string, { watch_progress?: number; completed_at?: string | null }> = {};
      if (notesRes.data) {
        for (const row of notesRes.data) {
          notesMap[row.lecture_id] = {
            watch_progress: row.watch_progress ?? 0,
            completed_at: row.completed_at ?? null,
          };
        }
      }

      const lecturesWithNotes: Lecture[] = lecturesData.map((l) => ({
        ...l,
        lecture_notes: notesMap[l.id] ?? null,
      }));

      setCourses(coursesData);
      setLectures(lecturesWithNotes);
    } catch (err) {
      console.error("データ取得エラー:", err);
      setCourses([]);
      setLectures([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const first = document.getElementsByTagName("script")[0];
      first?.parentNode?.insertBefore(tag, first);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const sortedLectures = courses.flatMap((c) =>
    lectures.filter((l) => l.course_id === c.id).sort((a, b) => a.sequence_number - b.sequence_number)
  );

  const getInProgressLecture = (): Lecture | null =>
    sortedLectures.find((l) => getLectureStatus(l) === "in_progress") ?? null;

  const getNextLecture = (): Lecture | null =>
    sortedLectures.find((l) => getLectureStatus(l) === "not_started" && isLectureUnlocked(l, lectures)) ?? null;

  const getCourseProgress = (courseId: string) => {
    const courseLectures = lectures.filter((l) => l.course_id === courseId);
    const completed = courseLectures.filter((l) => getLectureStatus(l) === "completed").length;
    const total = courseLectures.length;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  const totalProgress = {
    completed: lectures.filter((l) => getLectureStatus(l) === "completed").length,
    total: lectures.length,
  };

  const inProgressLecture = getInProgressLecture();
  const nextLecture = getNextLecture();
  const selectedLecture = selectedLectureId ? sortedLectures.find((l) => l.id === selectedLectureId) ?? null : null;

  const markAsAccessed = useCallback(
    async (lectureId: string) => {
      if (!user?.id) return;
      try {
        const { data: existingNote } = await supabase
          .from("lecture_notes")
          .select("id")
          .eq("lecture_id", lectureId)
          .eq("user_id", user.id)
          .maybeSingle();

        const now = new Date().toISOString();
        if (!existingNote) {
          await supabase.from("lecture_notes").insert({
            lecture_id: lectureId,
            user_id: user.id,
            watch_progress: 0,
            last_watched_at: now,
            created_at: now,
            updated_at: now,
            understood_main: false,
            understood_risk: false,
            understood_extra: false,
            memo: null,
          });
        } else {
          await supabase
            .from("lecture_notes")
            .update({ last_watched_at: now, updated_at: now })
            .eq("id", existingNote.id);
        }
        await fetchData();
      } catch (err) {
        console.error("アクセス記録エラー:", err);
      }
    },
    [user?.id, fetchData]
  );

  const markAsCompletedForExternal = useCallback(
    async (lectureId: string) => {
      if (!user?.id) return;
      const { data: existingNote, error: selectError } = await supabase
        .from("lecture_notes")
        .select("id")
        .eq("lecture_id", lectureId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (selectError) {
        console.error("完了マーク(select)エラー:", selectError);
        throw new Error(selectError.message);
      }

      const now = new Date().toISOString();
      if (existingNote) {
        const { error: updateError } = await supabase
          .from("lecture_notes")
          .update({ completed_at: now, watch_progress: 100, updated_at: now })
          .eq("id", existingNote.id);
        if (updateError) {
          console.error("完了マーク(update)エラー:", updateError);
          throw new Error(updateError.message);
        }
      } else {
        const { error: insertError } = await supabase.from("lecture_notes").insert({
          lecture_id: lectureId,
          user_id: user.id,
          watch_progress: 100,
          completed_at: now,
          last_watched_at: now,
          created_at: now,
          updated_at: now,
          understood_main: false,
          understood_risk: false,
          understood_extra: false,
          memo: null,
        });
        if (insertError) {
          console.error("完了マーク(insert)エラー:", insertError);
          throw new Error(insertError.message);
        }
      }
      await fetchData();
    },
    [user?.id, fetchData]
  );

  const handleExternalOpen = useCallback(
    async (url: string, lectureId: string, lectureTitle: string) => {
      window.open(url, "_blank", "noopener,noreferrer");
      await markAsAccessed(lectureId);
      setTimeout(() => {
        const shouldMark = window.confirm(
          `「${lectureTitle}」の内容を確認しましたか？\n\n「OK」をクリックすると完了としてマークされます。`
        );
        if (shouldMark) {
          setCompletionError(null);
          setLectures((prev) =>
            prev.map((l) =>
              l.id === lectureId
                ? {
                    ...l,
                    lecture_notes: {
                      ...l.lecture_notes,
                      watch_progress: 100,
                      completed_at: new Date().toISOString(),
                    },
                  }
                : l
            )
          );
          markAsCompletedForExternal(lectureId).catch((err: Error) => {
            setCompletionError(err?.message ?? "完了の記録に失敗しました");
            void fetchData();
          });
        }
      }, 2000);
    },
    [markAsAccessed, markAsCompletedForExternal, fetchData]
  );

  const handleLockedClick = useCallback((lecture: Lecture) => {
    const courseLectures = lectures.filter((l) => l.course_id === lecture.course_id);
    const prevLecture = courseLectures.find(
      (l) => l.sequence_number === lecture.sequence_number - 1
    );
    if (prevLecture) {
      window.alert(
        `🔒 この講座はロックされています\n\nまず「${prevLecture.title}」を完了してください。`
      );
    }
  }, [lectures]);

  const handleProgressUpdate = useCallback((lectureId: string, progress: number, completedAt?: string | null) => {
    setLectures((prev) =>
      prev.map((l) =>
        l.id === lectureId
          ? { ...l, lecture_notes: { ...l.lecture_notes, watch_progress: progress, completed_at: completedAt ?? undefined } }
          : l
      )
    );
  }, []);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-zinc-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-12">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-semibold text-zinc-600 flex items-center gap-1 hover:text-zinc-800 transition-colors mb-3"
          >
            <ArrowLeft className="h-4 w-4" /> 戻る
          </button>
        </div>

        <div className="rounded-xl glass-panel p-6">
          <h1 className="text-2xl font-bold text-zinc-900 mb-2 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-zinc-500 shrink-0" aria-hidden />
            あなたの学習ロードマップ
          </h1>
          <div className="text-sm text-zinc-600 mb-3">
            トータル進捗: {totalProgress.completed}/{totalProgress.total}完了
          </div>
          <div className="w-full bg-zinc-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
              style={{
                width:
                  totalProgress.total > 0 ? `${(totalProgress.completed / totalProgress.total) * 100}%` : "0%",
              }}
            />
          </div>
        </div>

        {(inProgressLecture ?? nextLecture) && (
          <div className="rounded-xl glass-panel p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 overflow-hidden">
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 mb-3 flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-zinc-500 shrink-0" aria-hidden />
              続きから再生
            </h2>
            <ContinueLectureCard
              lecture={inProgressLecture ?? nextLecture!}
              onClick={() => setSelectedLectureId((inProgressLecture ?? nextLecture)!.id)}
              onExternalOpen={handleExternalOpen}
            />
          </div>
        )}

        {completionError && (
          <div
            role="alert"
            className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
          >
            {completionError}
          </div>
        )}

        {courses.map((course) => {
          const courseLectures = lectures
            .filter((l) => l.course_id === course.id)
            .sort((a, b) => a.sequence_number - b.sequence_number);
          const progress = getCourseProgress(course.id);

          return (
            <div key={course.id} className="rounded-xl glass-panel p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-6 h-6 text-zinc-500 shrink-0" aria-hidden />
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2 flex-wrap">
                      {course.title}
                      {course.is_required && (
                        <span className="text-sm bg-red-100 text-red-600 px-2 py-1 rounded">必須</span>
                      )}
                      {!course.is_required && (
                        <span className="text-sm bg-blue-100 text-blue-600 px-2 py-1 rounded">推奨</span>
                      )}
                    </h2>
                    <p className="text-sm text-zinc-600 mt-0.5">{course.description}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-blue-600">
                    {progress.completed}/{progress.total}完了
                  </div>
                </div>
              </div>

              <div className="w-full bg-zinc-200 rounded-full h-2 mb-4">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>

              <div className="space-y-2">
                {courseLectures.map((lecture) => {
                  const status = getLectureStatus(lecture);
                  const isLocked = !isLectureUnlocked(lecture, lectures);
                  return (
                    <LectureSequenceItem
                      key={lecture.id}
                      lecture={lecture}
                      sequenceNumber={lecture.sequence_number}
                      status={status}
                      isLocked={isLocked}
                      onClick={() => setSelectedLectureId(lecture.id)}
                      onExternalOpen={(url, id, title) => handleExternalOpen(url, id, title)}
                      onLockedClick={handleLockedClick}
                      onMarkComplete={() => {
                        setCompletionError(null);
                        setLectures((prev) =>
                          prev.map((l) =>
                            l.id === lecture.id
                              ? {
                                  ...l,
                                  lecture_notes: {
                                    ...l.lecture_notes,
                                    watch_progress: 100,
                                    completed_at: new Date().toISOString(),
                                  },
                                }
                              : l
                          )
                        );
                        markAsCompletedForExternal(lecture.id).catch((err: Error) => {
                          setCompletionError(err?.message ?? "完了の記録に失敗しました");
                          void fetchData();
                        });
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {courses.length === 0 && (
          <div className="text-center py-12 text-zinc-500 rounded-xl glass-panel p-6">
            コースがまだ登録されていません。DBに courses テーブルとデータを適用してください。
          </div>
        )}

        {courses.length > 0 && lectures.length === 0 && (
          <div className="text-center py-12 text-zinc-500 rounded-xl glass-panel p-6">
            講座がまだ登録されていません。
          </div>
        )}
      </div>

      {selectedLecture && (
        <LectureDetailModal
          lecture={selectedLecture}
          session={session}
          onClose={() => setSelectedLectureId(null)}
          onComplete={fetchData}
          onLectureComplete={onLectureComplete}
          onProgressUpdate={handleProgressUpdate}
        />
      )}
    </div>
  );
}
