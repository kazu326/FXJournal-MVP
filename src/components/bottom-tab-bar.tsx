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
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pointer-events-none">
      <div
        className="flex justify-around items-center h-16 max-w-md mx-auto rounded-2xl pointer-events-auto border-t border-white/50 bg-white/80 backdrop-blur-lg shadow-[0_-10px_40px_-4px_rgba(59,130,246,0.45)]"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300 border-none bg-transparent min-w-0 py-2 ${
                isActive ? "!text-blue-600" : "!text-slate-600"
              }`}
            >
              <div
                className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
                  isActive ? "bg-blue-50/50 rounded-xl px-3 py-1" : ""
                }`}
              >
                <Icon strokeWidth={1.5} className="size-5 shrink-0" />
                <span className="text-xs leading-none whitespace-nowrap overflow-hidden text-ellipsis max-w-full block">{tab.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
