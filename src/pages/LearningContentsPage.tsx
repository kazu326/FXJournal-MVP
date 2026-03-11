import { useNavigate } from "react-router-dom";

export default function LearningContentsPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-dvh bg-[#F8F9FE] pb-24 fade-in font-sans">
            <main className="px-5 pt-6 pb-6 space-y-6 max-w-md mx-auto">
                {/* Header with Back button and Title */}
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => navigate("/mypage")}
                        className="text-sm font-semibold text-zinc-600 flex items-center gap-1 hover:text-zinc-800 transition-colors w-24 whitespace-nowrap"
                    >
                        ← 戻る
                    </button>
                    <h2 className="text-xl font-bold text-zinc-600 drop-shadow-sm flex-1 text-center">
                        学習コンテンツ
                    </h2>
                    <div className="w-24"></div> {/* Spacer to keep flex balance */}
                </div>

                {/* Content Images */}
                <div className="space-y-6">
                    {/* 初心者ガイド */}
                    <div
                        className="relative shadow-[0_8px_24px_rgba(0,0,0,0.06)] rounded-[32px] overflow-hidden cursor-pointer hover:shadow-[0_12px_28px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all group"
                        onClick={() => navigate("/learning/slides/1")}
                    >
                        <img
                            src="/mypage/beginnerlearning.png"
                            alt="FX初心者学習ガイド"
                            className="w-full h-auto object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-[32px]" />
                    </div>

                    {/* 基礎知識解説動画 */}
                    <div
                        className="relative shadow-[0_8px_24px_rgba(0,0,0,0.06)] rounded-[32px] overflow-hidden cursor-pointer hover:shadow-[0_12px_28px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all group"
                        onClick={() => navigate("/learning/videos")}
                    >
                        <img
                            src="/mypage/basicknowledge.png"
                            alt="FX基礎知識解説動画"
                            className="w-full h-auto object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-[32px]" />
                    </div>

                    {/* 講義動画 */}
                    <div
                        className="relative shadow-[0_8px_24px_rgba(0,0,0,0.06)] rounded-[32px] overflow-hidden cursor-pointer hover:shadow-[0_12px_28px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all group"
                        onClick={() => navigate("/lecture")}
                    >
                        <img
                            src="/mypage/lecturevideo.png"
                            alt="講義動画 E-effort"
                            className="w-full h-auto object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-[32px]" />
                    </div>
                </div>
            </main>
        </div>
    );
}
