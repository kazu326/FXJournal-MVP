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
    const { showMascot } = useMascotStore();
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [module, setModule] = useState<SlideModule | null>(null);
    const [isCompleted, setIsCompleted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const slideContainerRef = useRef<HTMLDivElement>(null);

    const currentStage = module?.order_index ?? 1;

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
                .select("id, title, image_urls, reward_xp, order_index")
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

    const scrollToSlide = (index: number) => {
        if (slideContainerRef.current) {
            const slideWidth = slideContainerRef.current.clientWidth;
            slideContainerRef.current.scrollTo({
                left: slideWidth * index,
                behavior: "smooth"
            });
        }
    };

    const handleNext = () => {
        if (!module) return;
        if (currentSlideIndex < module.image_urls.length - 1) {
            if (navigator.vibrate) {
                navigator.vibrate(30);
            }
            scrollToSlide(currentSlideIndex + 1);
        }
    };

    const handlePrev = () => {
        if (currentSlideIndex > 0) {
            scrollToSlide(currentSlideIndex - 1);
        }
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
                <button
                    onClick={() => navigate("/learning-contents")}
                    className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-xl"
                >
                    戻る
                </button>
            </div>
        );
    }

    const { image_urls: slides } = module;
    const isLastSlide = currentSlideIndex === slides.length - 1;

    return (
        <div className="min-h-dvh bg-gray-50 flex flex-col justify-start items-center font-sans text-gray-900 overflow-hidden fade-in">
            <div className="w-full min-h-dvh flex flex-col bg-gray-50 relative">
                {/* Header */}
                <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100 max-w-[480px] w-full mx-auto">
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3">
                        <button
                            onClick={() => navigate("/learning-contents")}
                            className="justify-self-start text-[13px] text-[#666] flex items-center gap-1 bg-transparent border-none px-0 py-2 hover:text-gray-900 hover:bg-transparent transition-colors whitespace-nowrap !min-h-0"
                        >
                            ← 戻る
                        </button>
                        <h2 className="justify-self-center text-[16px] font-bold text-gray-900 truncate px-2">
                            {module.title}
                        </h2>
                        <div className="justify-self-end text-[12px] font-bold text-[#999] whitespace-nowrap">
                            {currentSlideIndex + 1} / {slides.length}
                        </div>
                    </div>
                </header>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 shrink-0 max-w-[480px] mx-auto">
                    <div className="w-full h-3 bg-gray-200">
                        <div
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${((currentSlideIndex + 1) / slides.length) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Slide Viewer Area */}
                <main className="flex flex-col w-screen relative left-1/2 -translate-x-1/2 pb-4 bg-white">
                    <div
                        ref={slideContainerRef}
                        className="flex w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                        onScroll={handleScroll}
                    >
                        {slides.map((url, index) => (
                            <div
                                key={index}
                                className="w-full flex-shrink-0 snap-center"
                            >
                                <img
                                    src={url}
                                    className="w-full max-w-none h-auto block m-0 p-0"
                                    alt={`Slide ${index + 1}`}
                                />
                            </div>
                        ))}
                    </div>
                </main>

                {/* Navigation Controls */}
                <div className="w-full shrink-0 shadow-sm z-10 bg-white border-b border-gray-100 max-w-[480px] mx-auto">
                    <div className="flex justify-between items-center px-4 py-3 gap-4">
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
                </div>

                {/* Learning Map Component */}
                <section className="w-full mt-2 pb-12 pt-2 max-w-[480px] mx-auto">
                    <style>
                        {`
                    @keyframes gentle-bounce {
                        0%, 100% {
                            transform: translateY(-8%);
                            animation-timing-function: cubic-bezier(0.8,0,1,1);
                        }
                        50% {
                            transform: translateY(0);
                            animation-timing-function: cubic-bezier(0,0,0.2,1);
                        }
                    }
                    .animate-gentle-bounce {
                        animation: gentle-bounce 4s infinite;
                    }
                    `}
                    </style>

                    {/* 背景画像コンテナ（相対配置の基準） */}
                    <div
                        className="relative w-full overflow-hidden"
                        style={{
                            backgroundImage: `url(${STAGE_BACKGROUNDS[currentStage - 1]})`,
                            backgroundSize: 'cover',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center center',
                            aspectRatio: '1360 / 1100',
                        }}
                    >
                        {/* ジグザグすごろくレイアウト
                        上段（左→右）：ステージ1〜4
                        下段（右→左）：ステージ5〜8
                        各マスは表示サイズ 60×60px（120pxの2倍解像度のため50%表示） */}

                        {/* 上段：1→2→3→4 （左から右へ） */}
                        {[1, 2, 3, 4].map((stageNum, i) => {
                            const isCompleted = stageNum < currentStage
                            const isCurrent = stageNum === currentStage
                            const src = isCompleted
                                ? '/images/stages/mas/mas_done.png'
                                : isCurrent
                                    ? '/images/stages/mas/mas_current.png'
                                    : '/images/stages/mas/mas_locked.png'

                            return (
                                <div
                                    key={stageNum}
                                    className="absolute flex flex-col items-center"
                                    style={{
                                        width: '60px',
                                        top: '8%',
                                        left: `${8 + i * 23}%`,
                                    }}
                                >
                                    <img
                                        src={src}
                                        alt={`ステージ${stageNum}`}
                                        className={`w-[60px] h-[60px] ${isCurrent ? 'animate-gentle-bounce' : ''}`}
                                    />
                                    <span className="text-white text-[10px] font-bold mt-1 drop-shadow">
                                        {stageNum}
                                    </span>
                                </div>
                            )
                        })}

                        {/* 下段：5→6→7→8 （右から左へ・すごろくのジグザグ） */}
                        {[5, 6, 7, 8].map((stageNum, i) => {
                            const isCompleted = stageNum < currentStage
                            const isCurrent = stageNum === currentStage
                            const src = isCompleted
                                ? '/images/stages/mas/mas_done.png'
                                : isCurrent
                                    ? '/images/stages/mas/mas_current.png'
                                    : '/images/stages/mas/mas_locked.png'

                            return (
                                <div
                                    key={stageNum}
                                    className="absolute flex flex-col items-center"
                                    style={{
                                        width: '60px',
                                        top: '55%',
                                        // 右から左へ並べる（8→7→6→5の順で右から）
                                        left: `${8 + (3 - i) * 23}%`,
                                    }}
                                >
                                    <img
                                        src={src}
                                        alt={`ステージ${stageNum}`}
                                        className={`w-[60px] h-[60px] ${isCurrent ? 'animate-gentle-bounce' : ''}`}
                                    />
                                    <span className="text-white text-[10px] font-bold mt-1 drop-shadow">
                                        {stageNum}
                                    </span>
                                </div>
                            )
                        })}

                        {/* 現在地のラベル表示 */}
                        {currentStage && (
                            <div
                                className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-blue-500/90 text-white text-xs font-bold px-4 py-1 rounded-full shadow whitespace-nowrap"
                            >
                                現在：{STAGE_LABELS[currentStage - 1]}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
