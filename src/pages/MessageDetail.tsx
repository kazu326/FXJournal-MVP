import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Loader2 } from "lucide-react";

type MessageDetail = {
    id: string;
    title?: string; // announcements only
    body: string;
    created_at: string;
};

export default function MessageDetail() {
    const { type, id } = useParams<{ type: string; id: string }>();
    const navigate = useNavigate();
    const [message, setMessage] = useState<MessageDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!type || !id) return;
        fetchMessage();
    }, [type, id]);

    const fetchMessage = async () => {
        setLoading(true);
        let table = "";
        if (type === "announcements") table = "announcements";
        else if (type === "dm") table = "dm_messages";
        else {
            setError("無効なメッセージ種別です");
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from(table)
            .select(type === "announcements" ? "id, title, body, created_at" : "id, body, created_at")
            .eq("id", id)
            .single();

        if (error) {
            console.error("Fetch error:", error);
            setError("メッセージが見つかりませんでした");
        } else {
            setMessage(data as unknown as MessageDetail);
        }
        setLoading(false);
    };

    const handleBack = () => {
        // 履歴があれば戻る、なければホーム(メッセージタブ)へ
        if (window.history.length > 2) {
            navigate(-1);
        } else {
            window.location.href = "/";
        }
    };

    return (
        <div className="min-h-dvh bg-zinc-50 px-4 py-6">
            <div className="max-w-md mx-auto relative bg-white rounded-2xl shadow-sm min-h-[50vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-zinc-100 sticky top-0 bg-white/90 backdrop-blur-sm z-10">
                    <button
                        onClick={handleBack}
                        className="p-2 -ml-2 rounded-full hover:bg-zinc-100 transition-colors text-zinc-600"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="font-bold text-lg text-zinc-800 truncate">
                        {type === "announcements" ? "お知らせ" : "メッセージ"}
                    </h1>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-400">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            <p className="text-sm">読み込み中...</p>
                        </div>
                    ) : error ? (
                        <div className="py-12 text-center">
                            <div className="text-4xl mb-4">😢</div>
                            <p className="text-zinc-500 font-medium">{error}</p>
                            <button
                                onClick={handleBack}
                                className="mt-6 px-6 py-2 bg-zinc-100 text-zinc-600 rounded-full font-bold text-sm hover:bg-zinc-200 transition-colors"
                            >
                                戻る
                            </button>
                        </div>
                    ) : message ? (
                        <div className="space-y-6 animate-fade-in">
                            <div className="space-y-2">
                                <div className="text-xs text-zinc-400 font-medium">
                                    {new Date(message.created_at).toLocaleString()}
                                </div>
                                {message.title && (
                                    <h2 className="text-xl font-bold text-zinc-900 leading-snug">
                                        {message.title}
                                    </h2>
                                )}
                            </div>

                            <div className="prose prose-zinc prose-sm max-w-none text-zinc-700 leading-relaxed whitespace-pre-wrap">
                                {message.body}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
