import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

type MessageDetailRow = {
  id: string;
  title?: string;
  body: string;
  created_at: string;
};

export default function MessageDetail() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const [message, setMessage] = useState<MessageDetailRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!type || !id) return;
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);

      const table =
        type === "announcements"
          ? "announcements"
          : type === "dm"
            ? "dm_messages"
            : null;

      if (!table) {
        setError("無効なメッセージ種別です。");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from(table)
        .select(
          type === "announcements"
            ? "id, title, body, created_at"
            : "id, body, created_at",
        )
        .eq("id", id)
        .single();

      if (cancelled) return;
      if (fetchError) {
        setError("メッセージが見つかりませんでした。");
      } else {
        setMessage(data as unknown as MessageDetailRow);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [id, type]);

  const goBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/messages", { replace: true });
    }
  };

  return (
    <main className="min-h-dvh bg-zinc-50 px-4 py-5">
      <div className="mx-auto min-h-[50vh] max-w-md overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-zinc-100 bg-white/95 p-4 backdrop-blur">
          <button
            type="button"
            onClick={goBack}
            aria-label="メッセージ一覧に戻る"
            className="-ml-2 flex size-10 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="truncate text-lg font-bold text-zinc-800">
            {type === "announcements"
              ? "お知らせ"
              : "過去の個別メッセージ"}
          </h1>
        </header>

        <div className="p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-zinc-400">
              <Loader2 className="size-7 animate-spin text-blue-500 motion-reduce:animate-none" />
              <p className="text-sm">読み込み中...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-zinc-500">{error}</p>
              <button
                type="button"
                onClick={goBack}
                className="mt-5 min-h-10 rounded-full bg-zinc-100 px-5 text-sm font-bold text-zinc-600 hover:bg-zinc-200"
              >
                メッセージ一覧へ戻る
              </button>
            </div>
          ) : message ? (
            <article className="space-y-5">
              <div>
                <p className="text-xs font-medium text-zinc-400">
                  {new Date(message.created_at).toLocaleString("ja-JP")}
                </p>
                {message.title && (
                  <h2 className="mt-2 text-xl font-bold leading-snug text-zinc-900">
                    {message.title}
                  </h2>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                {message.body}
              </p>
              <div className="rounded-xl bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-500">
                {type === "announcements"
                  ? "このお知らせは一方向の通知です。記録や学習について相談したい場合は、メッセージページの「習慣サポート」を利用してください。"
                  : "これは過去の個別メッセージです。現在は読み取り専用です。"}
              </div>
            </article>
          ) : null}
        </div>
      </div>
    </main>
  );
}
