import React from "react";
import { Home, History, BookOpen, MessageCircle } from "lucide-react";

export type TabKey = "home" | "history" | "lecture" | "messages";

interface BottomTabBarProps {
  selectedTab: TabKey;
  onChange: (tab: TabKey) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ selectedTab, onChange }) => {
  const tabs = [
    { key: "home" as const, label: "ホーム", icon: Home },
    { key: "history" as const, label: "履歴", icon: History },
    { key: "lecture" as const, label: "講義", icon: BookOpen },
    { key: "messages" as const, label: "メッセージ", icon: MessageCircle },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pointer-events-none">
      <div
        className="flex justify-around items-center h-16 max-w-md mx-auto rounded-2xl pointer-events-auto border-t border-white/50 bg-white/80 backdrop-blur-lg shadow-[0_-10px_40px_-4px_rgba(59,130,246,0.45)]"
      >
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = selectedTab === tab.key;
          return (
            <React.Fragment key={tab.key}>
              {index > 0 && (
                <div className="w-px h-6 bg-slate-300/60 shrink-0" aria-hidden />
              )}
              <button
                type="button"
                onClick={() => onChange(tab.key)}
                className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300 !border-0 border-transparent bg-transparent min-w-0 py-2 outline-none ring-0 focus:outline-none focus:ring-0 ${
                  isActive ? "!text-blue-600" : "!text-slate-600"
                }`}
              >
                <div className="flex flex-col items-center justify-center gap-1 transition-all duration-300">
                  <Icon strokeWidth={1.5} className="size-5 shrink-0" />
                  <span className="text-xs leading-none whitespace-nowrap overflow-hidden text-ellipsis max-w-full block">{tab.label}</span>
                </div>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
