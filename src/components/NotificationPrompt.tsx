import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { subscribeToPush } from "../lib/push";
import { useAuth } from "../contexts/AuthContext";

export default function NotificationPrompt() {
    const { user } = useAuth();
    const [visible, setVisible] = useState(false);
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

    useEffect(() => {
        if (!user) return;

        if ("Notification" in window) {
            if (Notification.permission === "default") {
                // 通知権限が 'default' (未選択) の場合のみ表示
                const timer = setTimeout(() => setVisible(true), 3000);
                return () => clearTimeout(timer);
            } else if (Notification.permission === "granted") {
                // 既に許可済みの場合は、バックグラウンドで購読登録を更新
                void subscribeToPush(user.id);
            }
        }
    }, [user]);

    const handleEnable = async () => {
        setStatus("loading");
        try {
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                await subscribeToPush(user?.id ?? "");
                setStatus("success");
                setTimeout(() => setVisible(false), 2000);
            } else {
                // 拒否された場合
                setVisible(false);
            }
        } catch (e) {
            console.error(e);
            setStatus("error");
        }
    };

    const handleClose = () => {
        setVisible(false);
        // 本当は localStorage などに「今は出さない」フラグを保存すると親切
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full animate-slide-up">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-blue-100 dark:border-slate-700 p-4 flex gap-4">
                <div className="flex-shrink-0 bg-blue-100 dark:bg-slate-800 p-3 rounded-full flex items-center justify-center">
                    <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">通知をオンにしますか？</h3>
                        <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        重要なお知らせやメッセージをスマホへ直接お届けします。
                    </p>

                    {status === "idle" && (
                        <div className="flex gap-2">
                            <button
                                onClick={handleEnable}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                            >
                                許可する
                            </button>
                            <button
                                onClick={handleClose}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 text-sm font-semibold py-2 rounded-lg transition-colors"
                            >
                                あとで
                            </button>
                        </div>
                    )}

                    {status === "loading" && (
                        <div className="text-sm text-blue-600 font-semibold animate-pulse">
                            設定中...
                        </div>
                    )}

                    {status === "success" && (
                        <div className="text-sm text-emerald-600 font-semibold">
                            ✅ 設定しました！
                        </div>
                    )}

                    {status === "error" && (
                        <div className="text-sm text-red-500 font-semibold">
                            エラーが発生しました
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
