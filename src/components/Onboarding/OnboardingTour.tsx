import { useState } from "react";
import { X, ArrowRight, ArrowLeft } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Session } from "@supabase/supabase-js";

interface OnboardingStep {
  title: string;
  description: string;
  icon: string;
}

interface Props {
  session: Session | null;
  onComplete: () => void;
  onSkip: () => void;
}

export default function OnboardingTour({ session, onComplete, onSkip }: Props) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: OnboardingStep[] = [
    {
      title: "FX Journal へようこそ！",
      description:
        "あなたのFXトレードを記録・分析し、学習を通じて成長をサポートします。",
      icon: "👋",
    },
    {
      title: "ダッシュボードで進捗を確認",
      description:
        "XP、レベル、連続日数をチェック。毎日の成長を可視化します。",
      icon: "📊",
    },
    {
      title: "トレードを記録しよう",
      description:
        "記録タブから毎日のトレードを記録。記録するとXPがもらえます！",
      icon: "📝",
    },
    {
      title: "FXを基礎から学ぼう",
      description:
        "学習タブで順番に講座を進めることで、トレードの基礎を習得できます。",
      icon: "📚",
    },
    {
      title: "準備完了！",
      description:
        "学習が止まると、従来のアシストも見せられませんので、通知をONにすると安心です。",
      icon: "🎉",
    },
  ];

  const markOnboardingCompleted = async () => {
    if (session?.user?.id) {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("user_id", session.user.id);
    }
  };

  const handleComplete = async () => {
    await markOnboardingCompleted();
    onComplete();
  };

  const handleSkip = async () => {
    await markOnboardingCompleted();
    onSkip();
  };

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-fade-in">
        {/* 閉じるボタン */}
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="スキップ"
        >
          <X className="w-6 h-6" />
        </button>

        {/* ステップインジケーター */}
        <div className="flex gap-2 mb-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 flex-1 rounded-full transition-all ${index === currentStep
                  ? "bg-blue-500"
                  : index < currentStep
                    ? "bg-blue-300"
                    : "bg-gray-200"
                }`}
            />
          ))}
        </div>

        {/* コンテンツ */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{currentStepData.icon}</div>
          <h2 className="text-2xl font-bold mb-3 text-slate-800">
            {currentStepData.title}
          </h2>
          <p className="text-gray-600 leading-relaxed">
            {currentStepData.description}
          </p>
        </div>

        {/* ナビゲーションボタン */}
        <div className="flex gap-3">
          {!isFirstStep && (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex-1 py-3 px-4 border-2 border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              戻る
            </button>
          )}

          {isFirstStep && (
            <button
              type="button"
              onClick={handleSkip}
              className="flex-1 py-3 px-4 border-2 border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-all"
            >
              後で
            </button>
          )}

          {!isLastStep ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep + 1)}
              className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
            >
              次へ
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:opacity-90 transition-all"
            >
              始める 🚀
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
