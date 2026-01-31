import { useEffect, useState, useRef, useCallback } from "react";
import { X, Video, FileText, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { updateXpAndStreak, type XpUpdateResult } from "../lib/xp";
import { Card } from "./ui/card";
import type { Lecture } from "../types/database.types";

interface LectureNoteFull {
  id?: string;
  user_id?: string;
  lecture_id?: string;
  understood_main?: boolean;
  understood_risk?: boolean;
  understood_extra?: boolean;
  memo?: string | null;
  watch_progress?: number;
  completed_at?: string | null;
}

interface LectureDetailModalProps {
  lecture: Lecture;
  session: { user?: { id: string } } | null;
  onClose: () => void;
  onComplete: () => void;
  onLectureComplete?: (res: XpUpdateResult | null) => void;
  onProgressUpdate?: (lectureId: string, progress: number, completedAt?: string | null) => void;
}

export function LectureDetailModal({
  lecture,
  session,
  onClose,
  onComplete,
  onLectureComplete,
  onProgressUpdate,
}: LectureDetailModalProps) {
  const user = session?.user;
  const [note, setNote] = useState<Partial<LectureNoteFull>>({
    understood_main: false,
    understood_risk: false,
    understood_extra: false,
    memo: "",
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const playerRef = useRef<{ getCurrentTime(): number; getDuration(): number; destroy(): void } | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerContainerId = `youtube-player-modal-${lecture.id}`;

  useEffect(() => {
    if (!user?.id) return;
    void (async () => {
      const { data, error } = await supabase
        .from("lecture_notes")
        .select("*")
        .eq("lecture_id", lecture.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!error && data) setNote(data);
      else setNote({ understood_main: false, understood_risk: false, understood_extra: false, memo: "" });
    })();
  }, [lecture.id, user?.id]);

  const saveProgress = useCallback(
    async (progress: number) => {
      if (!user?.id) return;
      const { error } = await supabase.from("lecture_notes").upsert(
        {
          user_id: user.id,
          lecture_id: lecture.id,
          watch_progress: progress,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,lecture_id" }
      );
      if (!error) onProgressUpdate?.(lecture.id, progress);
    },
    [user?.id, lecture.id, onProgressUpdate]
  );

  const markAsCompleted = useCallback(async () => {
    if (!user?.id) return;
    const completedAt = new Date().toISOString();
    const { error } = await supabase.from("lecture_notes").upsert(
      {
        user_id: user.id,
        lecture_id: lecture.id,
        watch_progress: 100,
        completed_at: completedAt,
        updated_at: completedAt,
      },
      { onConflict: "user_id,lecture_id" }
    );
    if (!error) {
      onProgressUpdate?.(lecture.id, 100, completedAt);
      const xpRes = await updateXpAndStreak("LECTURE_COMPLETE");
      onLectureComplete?.(xpRes ?? null);
      onComplete();
      setStatus("🎉 講座完了！ +5 XP獲得");
    }
  }, [user?.id, lecture.id, onComplete, onLectureComplete, onProgressUpdate]);

  useEffect(() => {
    if (!lecture.youtube_video_id || !user?.id) return;
    const videoId = lecture.youtube_video_id;
    const initPlayer = () => {
      const el = document.getElementById(playerContainerId);
      if (!el) return;
      new window.YT.Player(playerContainerId, {
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
            if (event.data === window.YT.PlayerState.ENDED) markAsCompleted();
          },
        },
      });
    };
    if (window.YT?.Player) initPlayer();
    else window.onYouTubeIframeAPIReady = () => initPlayer();
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
  }, [lecture.id, lecture.youtube_video_id, user?.id, playerContainerId, saveProgress, markAsCompleted]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    setStatus("");
    try {
      const payload = {
        user_id: user.id,
        lecture_id: lecture.id,
        understood_main: note.understood_main,
        understood_risk: note.understood_risk,
        understood_extra: note.understood_extra,
        memo: note.memo,
        updated_at: new Date().toISOString(),
      };
      if (note.id) {
        const { error } = await supabase.from("lecture_notes").update(payload).eq("id", note.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lecture_notes").insert([{ ...payload, created_at: new Date().toISOString() }]);
        if (error) throw error;
      }
      setStatus("✅ 保存しました");
    } catch (err) {
      console.error(err);
      setStatus("保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  const titleLabel = lecture.sequence_number === 0 ? "序章" : `第${lecture.sequence_number}回`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-zinc-50 rounded-2xl shadow-xl max-w-lg w-full max-h-[90dvh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 shrink-0">
          <h2 className="text-lg font-bold text-zinc-900 truncate pr-2">{titleLabel}：{lecture.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-2 rounded-lg hover:bg-zinc-200 transition-colors"
            aria-label="閉じる"
          >
            <X className="h-5 w-5 text-zinc-600" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {lecture.duration_minutes != null && (
            <p className="text-sm text-zinc-500">⏱ 約{lecture.duration_minutes}分</p>
          )}

          {lecture.youtube_video_id && (
            <div id={playerContainerId} className="aspect-video w-full rounded-lg bg-zinc-900 shrink-0" />
          )}
          {!lecture.youtube_video_id && lecture.video_url && (
            <a
              href={lecture.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
            >
              <Video className="h-4 w-4" /> 動画を見る
            </a>
          )}

          {lecture.description && (
            <p className="text-sm text-zinc-600 leading-relaxed">{lecture.description}</p>
          )}

          {lecture.key_points && lecture.key_points.length > 0 && (
            <div className="rounded-xl glass-panel p-4">
              <h3 className="font-bold text-zinc-900 mb-2">💡 この講座のポイント</h3>
              <ul className="space-y-1">
                {lecture.key_points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                    <span className="text-blue-500 shrink-0">-</span>
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
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
            >
              <FileText className="h-4 w-4" /> スライドを見る
            </a>
          )}

          <Card className="rounded-xl glass-panel p-4 space-y-3">
            <div className="text-base font-bold text-zinc-900">理解度チェック</div>
            {[
              { key: "understood_main", label: "今日の講義のメインポイントを理解できた" },
              { key: "understood_risk", label: "リスク・注意点を理解できた" },
              { key: "understood_extra", label: "その他の重要ポイントも理解できた" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-zinc-300 text-blue-600"
                  checked={!!note[key as keyof LectureNoteFull]}
                  onChange={(e) => setNote({ ...note, [key]: e.target.checked })}
                />
                <span className="text-sm text-zinc-700">{label}</span>
              </label>
            ))}
            <label className="block">
              <span className="text-sm font-bold text-zinc-900">一言メモ（任意）</span>
              <textarea
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                rows={2}
                placeholder="学んだことや気付き..."
                value={note.memo ?? ""}
                onChange={(e) => setNote({ ...note, memo: e.target.value })}
              />
            </label>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 bg-blue-500 text-white rounded-xl font-bold text-sm hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <span className="animate-pulse">保存中...</span> : <><CheckCircle2 className="h-4 w-4" /> 講義メモを保存</>}
            </button>
            {status && (
              <p className={`text-center text-sm font-bold ${status.includes("✅") || status.includes("🎉") ? "text-green-600" : "text-red-600"}`}>
                {status}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
