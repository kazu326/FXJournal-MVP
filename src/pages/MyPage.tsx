import { useNavigate } from "react-router-dom";

interface MyPageProps {
    level: number;
}

export default function MyPage({ level }: MyPageProps) {
    const navigate = useNavigate();

    return (
        <div className="min-h-dvh bg-[#F8F9FE] pb-24 fade-in font-sans">


            <main className="px-3 pt-6 pb-6 space-y-6 max-w-md mx-auto">
                {/* Top rectangular card (Image-based Level Card) */}
                <div className="relative w-full rounded-[40px] overflow-hidden shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)]">
                    <img src="/mypage/mypage.png" alt="マイページ" className="w-full h-auto object-cover" />

                    {/* Level Display */}
                    <div
                        className="absolute top-5 right-6 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => navigate("/")}
                    >
                        <span
                            className="text-[44px] sm:text-[64px] font-black leading-none bg-clip-text text-transparent bg-gradient-to-b from-[#fcd34d] via-[#fbbf24] to-[#b45309]"
                            style={{
                                filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.4))",
                                letterSpacing: "-0.02em"
                            }}
                        >
                            Lv.{level}
                        </span>
                    </div>

                    {/* Transparent Setting Button over Gear */}
                    <button
                        className="absolute bottom-[10%] right-[3%] w-[12%] h-[25%] opacity-0 cursor-pointer"
                        title="設定"
                        aria-label="設定を開く"
                    />
                </div>

                {/* 4 Cards Grid - Images render as cards */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    {/* 学習コンテンツ */}
                    <div className="relative shadow-[0_8px_24px_rgba(0,0,0,0.06)] rounded-3xl overflow-hidden cursor-pointer hover:shadow-[0_12px_28px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all">
                        <img src="/mypage/learning.png" alt="学習コンテンツ" className="w-full h-auto object-cover" />
                    </div>

                    {/* 経済指標 (Coming Soon) */}
                    <div className="relative shadow-[0_8px_24px_rgba(0,0,0,0.06)] rounded-3xl overflow-hidden border border-zinc-200/50 cursor-default">
                        <div className="opacity-40 bg-[#7A7A7A] mix-blend-multiply w-full h-full absolute inset-0 z-10 pointer-events-none rounded-3xl" />
                        <img src="/mypage/indicator.png" alt="経済指標" className="w-full h-auto object-cover grayscale opacity-80" />

                        {/* Coming Soon Overlay Text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                            <span className="text-[16px] font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">Coming Soon</span>
                        </div>
                    </div>

                    {/* バッジ一覧 */}
                    <div className="relative shadow-[0_8px_24px_rgba(0,0,0,0.06)] rounded-3xl overflow-hidden cursor-pointer hover:shadow-[0_12px_28px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all">
                        <img src="/mypage/badgelist.png" alt="バッジ一覧" className="w-full h-auto object-cover" />
                    </div>

                    {/* カレンダー (Coming Soon) */}
                    <div className="relative shadow-[0_8px_24px_rgba(0,0,0,0.06)] rounded-3xl overflow-hidden border border-zinc-200/50 cursor-default">
                        <div className="opacity-40 bg-[#7A7A7A] mix-blend-multiply w-full h-full absolute inset-0 z-10 pointer-events-none rounded-3xl" />
                        <img src="/mypage/calender.png" alt="カレンダー" className="w-full h-auto object-cover grayscale opacity-80" />

                        {/* Coming Soon Overlay Text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                            <span className="text-[16px] font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">Coming Soon</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
