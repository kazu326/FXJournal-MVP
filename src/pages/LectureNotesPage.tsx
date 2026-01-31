import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { updateXpAndStreak, type XpUpdateResult } from "../lib/xp";
import { ArrowLeft, Video, FileText, CheckCircle2 } from "lucide-react";
import { Card } from "../components/ui/card";
import { StepCard } from "../components/StepCard";
import type { LectureStatus } from "../components/LectureItem";

export interface Lecture {
  id: string;
  title: string;
  description: string | null;
  lecture_date: string;
  video_url: string | null;
  slide_url: string | null;
  created_at?: string;
  updated_at?: string;
  step_number?: number | null;
  order_in_step?: number | null;
  content_type?: string | null;
  youtube_video_id?: string | null;
  external_url?: string | null;
  duration_minutes?: number | null;
  is_required?: boolean | null;
  key_points?: string[] | null;
}

export interface LectureNote {
  id: string;
  user_id: string;
  lecture_id: string;
  understood_main: boolean;
  understood_risk: boolean;
  understood_extra: boolean;
  memo: string | null;
  created_at: string;
  updated_at: string;
  watch_progress?: number;
  completed_at?: string | null;
}

interface LectureNotesPageProps {
  session: any;
  onBack: () => void;
  onLectureComplete?: (res: XpUpdateResult | null) => void;
}

export default function LectureNotesPage({ session, onBack, onLectureComplete }: LectureNotesPageProps) {
  const user = session?.user;
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [lectureIdToNote, setLectureIdToNote] = useState<Record<string, { watch_progress?: number; completed_at?: string | null }>>({});
  const [selectedLectureId, setSelectedLectureId] = useState<string | null>(null);
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [note, setNote] = useState<Partial<LectureNote>>({
    understood_main: false,
    understood_risk: false,
    understood_extra: false,
    memo: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const playerRef = useRef<{ getCurrentTime(): number; getDuration(): number; destroy(): void } | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void loadLectures();
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
    if (selectedLectureId && lectures.length > 0) {
      const found = lectures.find((l) => l.id === selectedLectureId);
      if (found) {
        setLecture(found);
        void loadNote(found.id);
      }
    } else {
      setLecture(null);
    }
  }, [selectedLectureId, lectures]);

  const loadLectures = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("lectures")
        .select("*")
        .not("step_number", "is", null)
        .order("step_number", { ascending: true })
        .order("order_in_step", { ascending: true });

      if (error) throw error;
      setLectures((data as Lecture[]) ?? []);

      if (user?.id) {
        const { data: notesData, error: notesError } = await supabase
          .from("lecture_notes")
          .select("lecture_id, watch_progress, completed_at")
          .eq("user_id", user.id);
        if (!notesError && notesData) {
          const map: Record<string, { watch_progress?: number; completed_at?: string | null }> = {};
          for (const row of notesData) {
            map[row.lecture_id] = {
              watch_progress: row.watch_progress ?? 0,
              completed_at: row.completed_at ?? null,
            };
          }
          setLectureIdToNote(map);
        }
      }
    } catch (err) {
      console.error("Error loading lectures:", err);
      setStatus("データの読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const loadNote = async (lectureId: string) => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase
        .from("lecture_notes")
        .select("*")
        .eq("lecture_id", lectureId)
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) setNote(data);
      else setNote({ understood_main: false, understood_risk: false, understood_extra: false, memo: "" });
    } catch (err) {
      console.error("Error loading note:", err);
    }
  };

  const handleSave = async () => {
    if (!lecture || !session?.user?.id) return;
    setSaving(true);
    setStatus("");

    try {
      const payload = {
        user_id: session.user.id,
        lecture_id: lecture.id,
        understood_main: note.understood_main,
        understood_risk: note.understood_risk,
        understood_extra: note.understood_extra,
        memo: note.memo,
        updated_at: new Date().toISOString(),
      };

      let error;
      if (note.id) {
        const { error: uError } = await supabase
          .from("lecture_notes")
          .update(payload)
          .eq("id", note.id);
        error = uError;
      } else {
        const { data: inserted, error: iError } = await supabase
          .from("lecture_notes")
          .insert([{ ...payload, created_at: new Date().toISOString() }])
          .select()
          .single();
        error = iError;
        if (inserted) setNote(inserted);
      }

      if (error) throw error;
      setStatus("✅ 保存しました");
    } catch (err) {
      console.error("Error saving note:", err);
      setStatus("保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  const stepGroups = {
    1: lectures.filter((l) => l.step_number === 1),
    2: lectures.filter((l) => l.step_number === 2),
    3: lectures.filter((l) => l.step_number === 3),
  };

  const getNextLecture = (currentLecture: Lecture): Lecture | null => {
    const stepNum = currentLecture.step_number as 1 | 2 | 3 | undefined;
    if (stepNum == null) return null;
    const currentStep = stepGroups[stepNum];
    if (!currentStep?.length) return null;
    const currentIndex = currentStep.findIndex((l) => l.id === currentLecture.id);
    if (currentIndex === -1) return null;
    if (currentIndex < currentStep.length - 1) {
      return currentStep[currentIndex + 1];
    }
    const nextStepNumber = stepNum + 1;
    if (nextStepNumber > 3) return null;
    const nextStep = stepGroups[nextStepNumber as 1 | 2 | 3];
    return nextStep?.[0] ?? null;
  };

  const saveProgress = useCallback(
    async (progress: number) => {
      if (!user?.id || !lecture) return;
      const { error } = await supabase.from("lecture_notes").upsert(
        {
          user_id: user.id,
          lecture_id: lecture.id,
          watch_progress: progress,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,lecture_id" }
      );
      if (error) {
        console.error("進捗保存エラー:", error);
        return;
      }
      setLectureIdToNote((prev) => ({
        ...prev,
        [lecture.id]: { ...prev[lecture.id], watch_progress: progress },
      }));
    },
    [user?.id, lecture]
  );

  const markAsCompleted = useCallback(async () => {
    if (!user?.id || !lecture) return;
    const { error } = await supabase.from("lecture_notes").upsert(
      {
        user_id: user.id,
        lecture_id: lecture.id,
        watch_progress: 100,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lecture_id" }
    );
    if (error) {
      console.error("完了保存エラー:", error);
      return;
    }
    setLectureIdToNote((prev) => ({
      ...prev,
      [lecture.id]: { watch_progress: 100, completed_at: new Date().toISOString() },
    }));
    const xpRes = await updateXpAndStreak("LECTURE_COMPLETE");
    onLectureComplete?.(xpRes ?? null);
    setStatus("🎉 講座完了！ +5 XP獲得");
  }, [user?.id, lecture, onLectureComplete]);

  const getStatus = (lectureId: string): LectureStatus => {
    const n = lectureIdToNote[lectureId];
    if (!n) return "locked";
    if (n.completed_at != null || (n.watch_progress ?? 0) >= 70) return "completed";
    if ((n.watch_progress ?? 0) > 0) return "in_progress";
    return "locked";
  };

  useEffect(() => {
    if (!lecture?.youtube_video_id || !user?.id) return;

    const videoId = lecture.youtube_video_id;
    const initPlayer = () => {
      const el = document.getElementById("youtube-player");
      if (!el) return;
      new window.YT.Player("youtube-player", {
        videoId,
        events: {
          onReady: (event: { target: { getCurrentTime(): number; getDuration(): number; destroy(): void } }) => {
            const p = event.target;
            playerRef.current = p;
            progressIntervalRef.current = setInterval(() => {
              try {
                const currentTime = p.getCurrentTime();
                const duration = p.getDuration();
                if (duration > 0) {
                  const progress = Math.min(100, Math.floor((currentTime / duration) * 100));
                  saveProgress(progress);
                }
              } catch {
                // ignore
              }
            }, 5000);
          },
          onStateChange: (event: { data: number }) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              markAsCompleted();
            }
          },
        },
      });
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (playerRef.current?.destroy) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [lecture?.id, lecture?.youtube_video_id, user?.id, saveProgress, markAsCompleted]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-zinc-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (selectedLectureId && lecture) {
    const nextLecture = getNextLecture(lecture);
    return (
      <div className="min-h-dvh pb-12">
        <div className="max-w-md mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedLectureId(null)}
              className="text-sm font-semibold text-zinc-600 flex items-center gap-1 hover:text-zinc-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> 戻る
            </button>
            <h1 className="text-lg font-bold text-zinc-900">講義メモ</h1>
            <div className="w-10" />
          </div>

          {/* ヘッダー: STEP・タイトル・所要時間 */}
          <div className="mb-6">
            <div className="text-sm text-zinc-500 mb-2">
              STEP {lecture.step_number} {lecture.is_required ? "（必須）" : "（推奨）"}
            </div>
            <h2 className="text-2xl font-bold text-zinc-900">{lecture.title}</h2>
            {lecture.duration_minutes != null && (
              <div className="text-sm text-zinc-500 mt-2">⏱ 所要時間: 約{lecture.duration_minutes}分</div>
            )}
          </div>

          {/* YouTube埋め込み（IFrame API で進捗取得） */}
          {lecture.youtube_video_id && (
            <div id="youtube-player" className="aspect-video w-full mb-6 rounded-lg bg-zinc-900" />
          )}

          {/* 動画リンク（youtube_video_id がない場合のフォールバック） */}
          {!lecture.youtube_video_id && lecture.video_url && (
            <a
              href={lecture.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/50 bg-white/40 backdrop-blur-sm px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-white/60 transition-colors shadow-sm mb-6"
            >
              <Video className="h-4 w-4" /> 動画を見る
            </a>
          )}

          {lecture.description && (
            <p className="text-sm text-zinc-600 leading-relaxed bg-white/30 p-3 rounded-xl border border-white/20 mb-6">
              {lecture.description}
            </p>
          )}

          {/* この講座のポイント */}
          {lecture.key_points && lecture.key_points.length > 0 && (
            <div className="rounded-xl glass-panel p-4 mb-6">
              <h3 className="font-bold text-lg text-zinc-900 mb-3">💡 この講座のポイント</h3>
              <ul className="space-y-2">
                {lecture.key_points.map((point, index) => (
                  <li key={index} className="flex items-start gap-2 text-zinc-700">
                    <span className="text-blue-500 mt-1 shrink-0">-</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lecture.slide_url && (
            <a
              href={lecture.slide_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/50 bg-white/40 backdrop-blur-sm px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-white/60 transition-colors shadow-sm mb-6"
            >
              <FileText className="h-4 w-4" /> スライドを見る
            </a>
          )}

          <Card className="w-full rounded-2xl !bg-transparent glass-panel backdrop-blur-xl p-5 space-y-6">
            <div className="text-base font-bold text-zinc-900">理解度チェック</div>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-white/50 bg-white/40 backdrop-blur-sm cursor-pointer active:bg-white/60 transition-colors shadow-sm">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  checked={!!note.understood_main}
                  onChange={(e) => setNote({ ...note, understood_main: e.target.checked })}
                />
                <span className="text-sm font-medium text-zinc-700">今日の講義のメインポイントを理解できた</span>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-xl border border-white/50 bg-white/40 backdrop-blur-sm cursor-pointer active:bg-white/60 transition-colors shadow-sm">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  checked={!!note.understood_risk}
                  onChange={(e) => setNote({ ...note, understood_risk: e.target.checked })}
                />
                <span className="text-sm font-medium text-zinc-700">リスク・注意点を理解できた</span>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-xl border border-white/50 bg-white/40 backdrop-blur-sm cursor-pointer active:bg-white/60 transition-colors shadow-sm">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  checked={!!note.understood_extra}
                  onChange={(e) => setNote({ ...note, understood_extra: e.target.checked })}
                />
                <span className="text-sm font-medium text-zinc-700">その他の重要ポイントも理解できた</span>
              </label>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-900 px-1">一言メモ（任意）</label>
              <textarea
                className="w-full rounded-xl border border-white/50 bg-white/40 backdrop-blur-sm px-4 py-3 text-sm focus:border-blue-500 focus:bg-white/80 focus:outline-none transition-all shadow-inner"
                rows={3}
                placeholder="学んだことや気付きをメモ..."
                value={note.memo || ""}
                onChange={(e) => setNote({ ...note, memo: e.target.value })}
              />
            </div>
            <div className="pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full h-14 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" /> 講義メモを保存する
                  </>
                )}
              </button>
              {status && (
                <p className={`mt-3 text-center text-sm font-bold ${status.includes("✅") ? "text-green-600" : "text-red-600"}`}>
                  {status}
                </p>
              )}
            </div>
          </Card>

          {/* 一覧に戻る / 次の講座 */}
          <div className="flex flex-wrap gap-3 mt-6">
            <button
              type="button"
              onClick={() => setSelectedLectureId(null)}
              className="px-6 py-3 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-semibold rounded-lg transition-colors"
            >
              ← 一覧に戻る
            </button>
            {nextLecture && (
              <button
                type="button"
                onClick={() => setSelectedLectureId(nextLecture.id)}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg flex items-center gap-2 transition-colors"
              >
                次の講座: {nextLecture.title.length > 12 ? nextLecture.title.slice(0, 12) + "…" : nextLecture.title} →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-12">
      <div className="space-y-6 p-4 max-w-md mx-auto">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-semibold text-zinc-600 flex items-center gap-1 hover:text-zinc-800 transition-colors mb-3"
          >
            <ArrowLeft className="h-4 w-4" /> 戻る
          </button>
          <h1 className="text-2xl font-bold text-zinc-900">📚 あなたの学習ロードマップ</h1>
        </div>

        <StepCard
          stepNumber={1}
          title="マインドセット（必須）"
          icon="🧠"
          lectures={stepGroups[1]}
          defaultExpanded={true}
          getStatus={getStatus}
          onSelectLecture={setSelectedLectureId}
        />
        <StepCard
          stepNumber={2}
          title="FX基礎知識（必須）"
          icon="📚"
          lectures={stepGroups[2]}
          defaultExpanded={false}
          getStatus={getStatus}
          onSelectLecture={setSelectedLectureId}
        />
        <StepCard
          stepNumber={3}
          title="実践スキル（推奨）"
          icon="🎯"
          lectures={stepGroups[3]}
          defaultExpanded={false}
          getStatus={getStatus}
          onSelectLecture={setSelectedLectureId}
        />

        {lectures.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            STEP制の講座がまだ登録されていません。DBに lectures_step_extension.sql を適用してください。
          </div>
        )}
      </div>
    </div>
  );
}
