import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { updateXpAndStreak } from "../lib/xp";
import { useMascotStore } from "../store/mascotStore";
import toast from "react-hot-toast";

type SlideModule = {
    id: string;
    title: string;
    image_urls: string[];
    reward_xp: number;
};

export default function SlideViewerPage() {
    const navigate = useNavigate();
    const { showMascot } = useMascotStore();
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [module, setModule] = useState<SlideModule | null>(null);
    const [isCompleted, setIsCompleted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const user = sessionData.session?.user;

            // スライドモジュールを取得（一番ORDERの小さいものをとりあえず取得）
            const { data: slidesData, error: slidesError } = await supabase
                .from("learning_slides_modules")
                .select("id, title, image_urls, reward_xp")
                .eq("is_published", true)
                .order("order_index", { ascending: true })
                .limit(1)
                .single();

            if (slidesError) throw slidesError;

            if (slidesData) {
                setModule(slidesData);

                // 完了状態の取得
                if (user) {
                    const { data: progressData } = await supabase
                        .from("learning_progress")
                        .select("id")
                        .eq("user_id", user.id)
                        .eq("content_type", "slide")
                        .eq("content_id", slidesData.id)
                        .maybeSingle();

                    if (progressData) {
                        setIsCompleted(true);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to load slides:", error);
            // toast.error("スライドの読み込みに失敗しました");
        } finally {
            setIsLoading(false);
        }
    };

    const handleComplete = async () => {
        if (!module || isCompleted) return;

        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const user = sessionData.session?.user;
            if (!user) {
                toast.error("ログインが必要です");
                return;
            }

            // 進捗を保存
            const { error: progressError } = await supabase
                .from("learning_progress")
                .insert({
                    user_id: user.id,
                    content_type: "slide",
                    content_id: module.id,
                    xp_rewarded: module.reward_xp
                });

            if (progressError) {
                if (progressError.code === '23505') {
                    setIsCompleted(true);
                    return;
                }
                throw progressError;
            }

            // XPを付与
            const result = await updateXpAndStreak("LECTURE_COMPLETE");
            if (result) {
                showMascot("levelUp");
                toast.success(`学習完了！ +${module.reward_xp}XP`);
                setIsCompleted(true);
            }

        } catch (error) {
            console.error("Failed to complete slide:", error);
            toast.error("完了処理に失敗しました");
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const container = e.currentTarget;
        const scrollPosition = container.scrollLeft;
        const slideWidth = container.clientWidth;
        const newIndex = Math.round(scrollPosition / slideWidth);
        if (newIndex !== currentSlideIndex) {
            setCurrentSlideIndex(newIndex);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-dvh bg-zinc-950 flex flex-col justify-center items-center text-white">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!module || module.image_urls.length === 0) {
        return (
            <div className="min-h-dvh bg-zinc-950 flex flex-col items-center justify-center font-sans text-zinc-50 p-4 text-center">
                <p>スライドが見つかりませんでした。</p>
                <button
                    onClick={() => navigate("/learning-contents")}
                    className="mt-6 px-6 py-2 bg-blue-600 rounded-xl"
                >
                    戻る
                </button>
            </div>
        );
    }

    const { image_urls: slides } = module;
    const isLastSlide = currentSlideIndex === slides.length - 1;

    return (
        <div className="min-h-dvh bg-zinc-950 flex flex-col font-sans fade-in text-zinc-50">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-4 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50">
                <button
                    onClick={() => navigate("/learning-contents")}
                    className="text-sm font-semibold flex items-center gap-1 hover:text-white transition-colors w-20"
                >
                    ← 戻る
                </button>
                <h2 className="text-sm font-bold flex-1 text-center truncate px-2">
                    {module.title}
                </h2>
                <div className="w-20 text-right text-xs font-bold text-zinc-400">
                    {currentSlideIndex + 1} / {slides.length}
                </div>
            </header>

            {/* Slide Viewer Area */}
            <main className="flex-1 flex flex-col justify-center items-center overflow-hidden">
                <div
                    className="flex w-full h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
                    onScroll={handleScroll}
                >
                    {slides.map((url, index) => (
                        <div
                            key={index}
                            className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center p-4"
                        >
                            <img
                                src={url}
                                alt={`Slide ${index + 1}`}
                                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                            />
                        </div>
                    ))}
                </div>
            </main>

            {/* Pagination Indicators */}
            <div className="flex justify-center gap-2 py-6 bg-zinc-950">
                {slides.map((_, index) => (
                    <div
                        key={index}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentSlideIndex ? "bg-blue-500 w-4" : "bg-zinc-700"
                            }`}
                    />
                ))}
            </div>

            {/* Complete Button (shows only on last slide) */}
            <div className={`px-5 pb-8 transition-opacity duration-500 ${isLastSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <button
                    onClick={handleComplete}
                    disabled={isCompleted}
                    className={`w-full font-bold py-4 rounded-xl shadow-lg transition-colors ${isCompleted
                            ? 'bg-emerald-600 text-white cursor-default'
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                >
                    {isCompleted ? '学習完了！' : `学習を完了する (+${module.reward_xp} XP)`}
                </button>
            </div>
        </div>
    );
}
