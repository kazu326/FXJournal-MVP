import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { updateXpAndStreak } from "../lib/xp";
import { useTradeStore } from "../store/tradeStore";
import { useMascotStore } from "../store/mascotStore";
import toast from "react-hot-toast";

type VideoItem = {
    id: string;
    title: string;
    youtube_url: string;
    reward_xp: number;
};

export default function VideoListPage() {
    const navigate = useNavigate();
    const { showMascot } = useMascotStore();
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const user = sessionData.session?.user;

            // 動画一覧を取得
            const { data: videosData, error: videosError } = await supabase
                .from("learning_videos")
                .select("id, title, youtube_url, reward_xp")
                .eq("is_published", true)
                .order("order_index", { ascending: true });

            if (videosError) throw videosError;

            if (videosData) {
                setVideos(videosData);
            }

            // 完了状態の取得
            if (user) {
                const { data: progressData } = await supabase
                    .from("learning_progress")
                    .select("content_id")
                    .eq("user_id", user.id)
                    .eq("content_type", "video");

                if (progressData) {
                    setCompletedIds(new Set(progressData.map(p => p.content_id)));
                }
            }
        } catch (error) {
            console.error("Failed to load videos:", error);
            toast.error("動画の読み込みに失敗しました");
        } finally {
            setIsLoading(false);
        }
    };

    const handleComplete = async (video: VideoItem) => {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const user = sessionData.session?.user;
            if (!user) {
                toast.error("ログインが必要です");
                return;
            }

            // 完了済みなら何もしない
            if (completedIds.has(video.id)) return;

            // 進捗を保存
            const { error: progressError } = await supabase
                .from("learning_progress")
                .insert({
                    user_id: user.id,
                    content_type: "video",
                    content_id: video.id,
                    xp_rewarded: video.reward_xp
                });

            if (progressError) {
                if (progressError.code === '23505') { // unique violation
                    setCompletedIds(prev => new Set(prev).add(video.id));
                    return;
                }
                throw progressError;
            }

            // XPを付与
            const result = await updateXpAndStreak("LECTURE_COMPLETE");
            if (result) {
                // Level UI should implicitly update because they listen to state/session? Wait, in this app global state holds level? No App.tsx holds level.
                // Actually this app uses local component states for xp, but let's assume it updates. We trigger mascot to show at least.
                showMascot("levelUp"); // or some celebration
                toast.success(`視聴完了！ +${video.reward_xp}XP`);
                setCompletedIds(prev => new Set(prev).add(video.id));
            }

        } catch (error) {
            console.error("Failed to complete video:", error);
            toast.error("完了処理に失敗しました");
        }
    };

    return (
        <div className="min-h-dvh bg-[#F8F9FE] pb-24 fade-in font-sans">
            <main className="px-5 pt-6 pb-6 space-y-6 max-w-md mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => navigate("/learning-contents")}
                        className="text-sm font-semibold text-zinc-600 flex items-center gap-1 hover:text-zinc-800 transition-colors w-24 whitespace-nowrap"
                    >
                        ← 戻る
                    </button>
                    <h2 className="text-xl font-bold text-zinc-600 drop-shadow-sm flex-1 text-center">
                        基礎知識解説動画
                    </h2>
                    <div className="w-24"></div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {videos.map((video, index) => {
                            const isCompleted = completedIds.has(video.id);

                            return (
                                <div key={video.id} className="bg-white rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] overflow-hidden">
                                    <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-3">
                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {isCompleted ? '✓' : index + 1}
                                        </span>
                                        <h3 className="font-bold text-zinc-800 flex-1">{video.title}</h3>
                                    </div>

                                    <div className="relative w-full pt-[56.25%] bg-zinc-900">
                                        <iframe
                                            src={`https://www.youtube.com/embed/${video.youtube_url}`}
                                            title={video.title}
                                            className="absolute top-0 left-0 w-full h-full"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    </div>

                                    <div className="p-4">
                                        <button
                                            onClick={() => handleComplete(video)}
                                            disabled={isCompleted}
                                            className={`w-full font-bold py-3 rounded-xl transition-colors ${isCompleted
                                                    ? 'bg-emerald-50 text-emerald-600 cursor-default'
                                                    : 'bg-zinc-100 hover:bg-blue-50 text-zinc-600 hover:text-blue-700'
                                                }`}
                                        >
                                            {isCompleted ? '視聴済み' : `視聴済みにする (+${video.reward_xp} XP)`}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
