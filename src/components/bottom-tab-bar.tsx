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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-zinc-200 pb-safe">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                isActive ? "text-blue-600" : "text-zinc-400"
              }`}
            >
              <Icon className={`h-6 w-6 ${isActive ? "fill-blue-50" : ""}`} />
              <span className="text-[10px] font-bold mt-1">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
