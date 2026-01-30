import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Video, FileText, CheckCircle2 } from "lucide-react";
import { GlassCard as Card } from "../components/ui/card";

export interface Lecture {
  id: string;
  title: string;
  description: string | null;
  lecture_date: string;
  video_url: string | null;
  slide_url: string | null;
  created_at: string;
  updated_at: string;
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
}

interface LectureNotesPageProps {
  session: any;
  onBack: () => void;
}

export default function LectureNotesPage({ session, onBack }: LectureNotesPageProps) {
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

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // 直近の講義を1件取得
      const { data: lectures, error: lError } = await supabase
        .from("lectures")
        .select("*")
        .order("lecture_date", { ascending: false })
        .limit(1);

      if (lError) throw lError;
      if (!lectures || lectures.length === 0) {
        setLoading(false);
        return;
      }

      const latestLecture = lectures[0];
      setLecture(latestLecture);

      // 既存のメモを取得
      const { data: existingNote, error: nError } = await supabase
        .from("lecture_notes")
        .select("*")
        .eq("lecture_id", latestLecture.id)
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (nError) throw nError;
      if (existingNote) {
        setNote(existingNote);
      }
    } catch (err) {
      console.error("Error loading lecture data:", err);
      setStatus("データの読み込みに失敗しました。");
    } finally {
      setLoading(false);
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
        // UPDATE
        const { error: uError } = await supabase
          .from("lecture_notes")
          .update(payload)
          .eq("id", note.id);
        error = uError;
      } else {
        // INSERT
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
      
      // TODO: update_xp_and_streak('WEEKLY_LECTURE_NOTE') を後で追加
      // const { data: xpRes } = await updateXpAndStreak("WEEKLY_LECTURE_NOTE");
      // if (xpRes) applyXpResult(xpRes);

    } catch (err) {
      console.error("Error saving lecture note:", err);
      setStatus("保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-zinc-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="min-h-dvh bg-zinc-50 p-4">
        <button onClick={onBack} className="flex items-center gap-1 text-zinc-600 mb-6 font-semibold">
          <ArrowLeft className="h-4 w-4" /> 戻る
        </button>
        <div className="text-center py-12 text-zinc-500">
          講義データが見つかりませんでした。
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-12">
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <button 
            onClick={onBack} 
            className="text-sm font-semibold text-zinc-600 flex items-center gap-1 hover:text-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> 戻る
          </button>
          <h1 className="text-lg font-bold text-zinc-900">講義メモ</h1>
          <div className="w-10"></div>
        </div>

        {/* 講義情報カード */}
        <Card className="p-5 space-y-4">
          <div>
            <div className="text-xs font-bold text-blue-600 mb-1 px-1">最新の講義</div>
            <h2 className="text-xl font-bold text-zinc-900">{lecture.title}</h2>
            <div className="text-sm text-zinc-500 px-1">{lecture.lecture_date}</div>
          </div>
          
          {lecture.description && (
            <p className="text-sm text-zinc-600 leading-relaxed bg-white/30 p-3 rounded-xl border border-white/20">
              {lecture.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2">
            {lecture.video_url && (
              <a 
                href={lecture.video_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-white/50 bg-white/40 backdrop-blur-sm px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-white/60 transition-colors shadow-sm"
              >
                <Video className="h-4 w-4" /> 動画を見る
              </a>
            )}
            {lecture.slide_url && (
              <a 
                href={lecture.slide_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-white/50 bg-white/40 backdrop-blur-sm px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-white/60 transition-colors shadow-sm"
              >
                <FileText className="h-4 w-4" /> スライド
              </a>
            )}
          </div>
        </Card>

        {/* メモフォームカード */}
        <Card className="p-5 space-y-6">
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
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
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
      </div>
    </div>
  );
}
