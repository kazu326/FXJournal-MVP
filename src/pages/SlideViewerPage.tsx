import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { updateXpAndStreak } from "../lib/xp";
import { useMascotStore } from "../store/mascotStore";
import toast from "react-hot-toast";

const STAGE_BACKGROUNDS = [
    '/images/stages/stage1.png',
    '/images/stages/stage2.png',
    '/images/stages/stage3.png',
    '/images/stages/stage4.png',
    '/images/stages/stage5.png',
    '/images/stages/stage6.png',
    '/images/stages/stage7.png',
    '/images/stages/stage8.png',
];

const STAGE_LABELS = [
    '基礎① 1〜3章',
    '基礎② 4〜6章',
    '基礎③ 7〜9章',
    '基礎④ 10〜12章',
    'LV① 1〜3章',
    'LV② 4〜6章',
    'LV③ 7〜9章',
    'LV④ 10〜12章',
];

type SlideModule = {
    id: string;
    title: string;
    image_urls: string[];
    reward_xp: number;
    order_index: number;
};

export default function SlideViewerPage() {
    const navigate = useNavigate();
    const stageStr = window.location.pathname.split("/").pop();
    const stageNumber = parseInt(stageStr ?? "1", 10);
    const { showMascot } = useMascotStore();
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [module, setModule] = useState<SlideModule | null>(null);
    const [isCompleted, setIsCompleted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [completedStages, setCompletedStages] = useState<number[]>([]);

    const slideContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setCurrentSlideIndex(0);
        loadData();
    }, [stageNumber]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const user = sessionData.session?.user;

            const { data: slidesData, error: slidesError } = await supabase
                .from("learning_slides_modules")
                .select("id, title, image_urls, reward_xp, order_index")
                .eq("is_published", true)
                .eq("order_index", stageNumber)
                .single();

            if (slidesError) throw slidesError;

            if (slidesData) {
                setModule(slidesData);

                if (user) {
                    const { data: progressData } = await supabase
                        .from("learning_progress")
                        .select("content_id")
                        .eq("user_id", user.id)
                        .eq("content_type", "slide");

                    if (progressData) {
                        const completedIds = progressData.map(p => p.content_id);
                        setIsCompleted(completedIds.includes(slidesData.id));
                    }

                    // 全ステージの完了状況を取得
                    const { data: allModules } = await supabase
                        .from("learning_slides_modules")
                        .select("id, order_index")
                        .eq("is_published", true);

                    if (allModules && progressData) {
                        const completedIds = progressData.map(p => p.content_id);
                        const completed = allModules
                            .filter(m => completedIds.includes(m.id))
                            .map(m => m.order_index);
                        setCompletedStages(completed);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to load slides:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleComplete = async () => {
        if (!module) return;

        try {
            if (!isCompleted) {
                const { data: sessionData } = await supabase.auth.getSession();
                const user = sessionData.session?.user;
                if (!user) {
                    toast.error("ログインが必要です");
                    return;
                }

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
                    } else {
                        throw progressError;
                    }
                } else {
                    const result = await updateXpAndStreak("LECTURE_COMPLETE");
                    if (result) {
                        showMascot("levelUp");
                        toast.success(`学習完了！ +${module.reward_xp}XP`);
                        setIsCompleted(true);
                    }
                }
            }

            // 次のステージへ遷移
            if (stageNumber < 8) {
                navigate(`/learning/slides/${stageNumber + 1}`);
            } else {
                navigate("/learning-contents");
            }

        } catch (error) {
            console.error("Failed to complete slide:", error);
            toast.error("完了処理に失敗しました");
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const container = e.currentTarget;
        const newIndex = Math.round(container.scrollLeft / container.clientWidth);
        if (newIndex !== currentSlideIndex) {
            setCurrentSlideIndex(newIndex);
        }
    };

    const scrollToSlide = (index: number) => {
        if (slideContainerRef.current) {
            slideContainerRef.current.scrollTo({
                left: slideContainerRef.current.clientWidth * index,
                behavior: "smooth"
            });
        }
    };

    const handleNext = () => {
        if (!module) return;
        if (currentSlideIndex < module.image_urls.length - 1) {
            if (navigator.vibrate) navigator.vibrate(30);
            scrollToSlide(currentSlideIndex + 1);
        }
    };

    const handlePrev = () => {
        if (currentSlideIndex > 0) scrollToSlide(currentSlideIndex - 1);
    };

    if (isLoading) {
        return (
            <div className="min-h-dvh bg-gray-50 flex flex-col justify-center items-center text-gray-900">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!module || module.image_urls.length === 0) {
        return (
            <div className="min-h-dvh bg-gray-50 flex flex-col items-center justify-center font-sans text-gray-900 p-4 text-center">
                <p>スライドが見つかりませんでした。</p>
                <button onClick={() => navigate("/learning-contents")} className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-xl">
                    戻る
                </button>
            </div>
        );
    }

    const { image_urls: slides } = module;
    const isLastSlide = currentSlideIndex === slides.length - 1;

    return (
        <div className="min-h-dvh bg-gray-50 flex flex-col font-sans fade-in text-gray-900">

            {/* Header */}
            <header className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3 bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
                <button
                    onClick={() => navigate("/learning-contents")}
                    className="justify-self-start text-[13px] text-[#666] flex items-center gap-1 bg-transparent border-none p-0 hover:text-gray-900 transition-colors"
                >
                    ← 戻る
                </button>
                <h2 className="justify-self-center text-[16px] font-bold text-gray-900 truncate px-2">
                    {module.title}
                </h2>
                <div className="justify-self-end text-[12px] text-[#999] whitespace-nowrap">
                    {currentSlideIndex + 1} / {slides.length}
                </div>
            </header>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-gray-200 shrink-0">
                <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${((currentSlideIndex + 1) / slides.length) * 100}%` }}
                />
            </div>

            {/* Slide Viewer */}
            <main className="flex flex-col w-full bg-white">
                <div
                    ref={slideContainerRef}
                    className="flex w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                    onScroll={handleScroll}
                >
                    {slides.map((url, index) => (
                        <div key={index} className="w-full flex-shrink-0 snap-center">
                            <img
                                src={url}
                                className="w-full aspect-[16/9] object-cover"
                                alt={`Slide ${index + 1}`}
                            />
                        </div>
                    ))}
                </div>
            </main>

            {/* Navigation Controls */}
            <div className="flex justify-between items-center px-4 py-3 bg-white border-b border-gray-100 gap-4 shrink-0 shadow-sm z-10">
                <button
                    onClick={handlePrev}
                    disabled={currentSlideIndex === 0}
                    className={`flex-1 py-2 px-4 rounded-xl text-[15px] font-medium border-2 transition-colors ${currentSlideIndex === 0
                        ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                        : 'border-blue-100 text-blue-600 hover:bg-blue-50 bg-white'
                        }`}
                >
                    ← 前へ
                </button>

                {isLastSlide ? (
                    <button
                        onClick={handleComplete}
                        disabled={isCompleted}
                        className={`flex-1 py-2 px-4 rounded-xl text-[15px] font-medium border-2 transition-colors ${isCompleted
                            ? 'border-transparent bg-emerald-600 text-white cursor-default'
                            : 'border-transparent bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                            }`}
                    >
                        {isCompleted ? '学習完了！' : '完了する'}
                    </button>
                ) : (
                    <button
                        onClick={handleNext}
                        className="flex-1 py-2 px-4 rounded-xl text-[15px] font-medium border-2 border-transparent bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-colors"
                    >
                        次へ →
                    </button>
                )}
            </div>

            {/* Learning Map */}
            <section className="w-full px-4 mt-2 pb-20 pt-2">
                <style>{`
                    @keyframes gentle-bounce {
                        0%, 100% { transform: translateY(-8%); animation-timing-function: cubic-bezier(0.8,0,1,1); }
                        50% { transform: translateY(0); animation-timing-function: cubic-bezier(0,0,0.2,1); }
                    }
                    .animate-gentle-bounce { animation: gentle-bounce 4s infinite; }
                `}</style>

                <div
                    className="relative w-full overflow-hidden"
                    style={{
                        backgroundImage: `url(${STAGE_BACKGROUNDS[stageNumber - 1]})`,
                        backgroundSize: 'cover',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center center',
                        aspectRatio: '1360 / 1100',
                    }}
                >
                    {[1, 2, 3, 4].map((stageNum, i) => {
                        const done = completedStages.includes(stageNum);
                        const current = stageNum === stageNumber;
                        const src = done
                            ? '/images/stages/mas/mas_done.png'
                            : current
                                ? '/images/stages/mas/mas_current.png'
                                : '/images/stages/mas/mas_locked.png';
                        return (
                            <div
                                key={stageNum}
                                className="absolute flex flex-col items-center cursor-pointer"
                                style={{ width: '60px', top: '8%', left: `${8 + i * 23}%` }}
                                onClick={() => navigate(`/learning/slides/${stageNum}`)}
                            >
                                <img src={src} alt={`ステージ${stageNum}`} className={`w-[60px] h-[60px] ${current ? 'animate-gentle-bounce' : ''}`} />
                                <span className="text-white text-[10px] font-bold mt-1 drop-shadow">{stageNum}</span>
                            </div>
                        );
                    })}

                    {[5, 6, 7, 8].map((stageNum, i) => {
                        const done = completedStages.includes(stageNum);
                        const current = stageNum === stageNumber;
                        const src = done
                            ? '/images/stages/mas/mas_done.png'
                            : current
                                ? '/images/stages/mas/mas_current.png'
                                : '/images/stages/mas/mas_locked.png';
                        return (
                            <div
                                key={stageNum}
                                className="absolute flex flex-col items-center cursor-pointer"
                                style={{ width: '60px', top: '55%', left: `${8 + (3 - i) * 23}%` }}
                                onClick={() => navigate(`/learning/slides/${stageNum}`)}
                            >
                                <img src={src} alt={`ステージ${stageNum}`} className={`w-[60px] h-[60px] ${current ? 'animate-gentle-bounce' : ''}`} />
                                <span className="text-white text-[10px] font-bold mt-1 drop-shadow">{stageNum}</span>
                            </div>
                        );
                    })}

                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-blue-500/90 text-white text-xs font-bold px-4 py-1 rounded-full shadow whitespace-nowrap">
                        現在：{STAGE_LABELS[stageNumber - 1]}
                    </div>
                </div>
            </section>
        </div>
    );
}
