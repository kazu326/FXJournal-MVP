import { useState, useEffect } from "react";
import { Mail, Send, FileText, Plus, Save, Trash2, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

type UserRow = {
    user_id: string;
    username: string | null;
    avatar_url: string | null;
    email: string | null;
};

type TemplateRow = {
    id: string;
    title: string;
    body: string;
    is_system: boolean;
};

export default function AdminMessages() {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // Form State
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [targetMode, setTargetMode] = useState<"broadcast" | "individual">("broadcast");

    // Mock Templates (後でDB化)
    const [templates] = useState<TemplateRow[]>([
        { id: "1", title: "【重要】メンテナンスのお知らせ", body: "平素よりFX Journalをご利用いただき...", is_system: true },
        { id: "2", title: "学習応援メッセージ", body: "今週の進捗はいかがですか？...", is_system: false },
    ]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        // admin_user_stats から取得 (id ではなく user_id を使用)
        const { data, error } = await supabase
            .from("admin_user_stats")
            .select("user_id, username, avatar_url, email")
            .limit(100);

        if (error) {
            console.error("User fetch error:", error);
            toast.error("ユーザー一覧の取得に失敗しました");
        } else {
            // アバターURLがない可能性があるため、適切にキャストまたはマッピング
            const mappedUsers = (data as any[]).map(u => ({
                user_id: u.user_id,
                username: u.username,
                avatar_url: u.avatar_url ?? null,
                email: u.email
            }));
            setUsers(mappedUsers);
        }
        setLoading(false);
    };

    const handleSend = async () => {
        if (!subject.trim() || !body.trim()) {
            toast.error("件名と本文を入力してください");
            return;
        }
        if (targetMode === "individual" && selectedUserIds.length === 0) {
            toast.error("送信対象のユーザーを選択してください");
            return;
        }

        setSending(true);
        try {
            // 現在のユーザー(送信者)を取得
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) throw new Error("Not authenticated");

            const messagesToInsert = [];

            if (targetMode === "broadcast") {
                // 一斉送信: recipient_user_id = null
                messagesToInsert.push({
                    sender_user_id: currentUser.id,
                    recipient_user_id: null,
                    body: `【${subject}】\n\n${body}`,
                    created_at: new Date().toISOString()
                });
            } else {
                // 個別送信: 選択されたユーザーごとに作成
                for (const recipientId of selectedUserIds) {
                    messagesToInsert.push({
                        sender_user_id: currentUser.id,
                        recipient_user_id: recipientId,
                        body: `【${subject}】\n\n${body}`,
                        created_at: new Date().toISOString()
                    });
                }
            }

            const { error } = await supabase
                .from("dm_messages")
                .insert(messagesToInsert);

            if (error) throw error;

            toast.success("メッセージを送信しました");
            setSubject("");
            setBody("");
            setSelectedUserIds([]);
        } catch (e) {
            console.error(e);
            toast.error("送信に失敗しました");
        } finally {
            setSending(false);
        }
    };

    const applyTemplate = (tmpl: TemplateRow) => {
        setSubject(tmpl.title);
        setBody(tmpl.body);
        toast.success("定型文を適用しました");
    };

    const toggleUserSelection = (userId: string) => {
        setSelectedUserIds(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    return (
        <div className="space-y-6 text-slate-100">
            <header className="flex flex-col gap-2">
                <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
                    <Mail className="w-5 h-5 text-emerald-400" />
                    <span>メッセージ配信</span>
                </h1>
                <p className="text-sm text-slate-400">
                    ユーザーへのプッシュ通知・DMを一斉または個別に送信できます。
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-3 py-12 flex justify-center text-slate-500 gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>データを読み込み中...</span>
                    </div>
                ) : (
                    <>
                        {/* 左カラム: 作成フォーム */}
                        <div className="lg:col-span-2 space-y-6">
                            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-slate-400" />
                                        メッセージ作成
                                    </h2>
                                    <div className="flex gap-2">
                                        <select
                                            className="bg-slate-800 border-none text-xs rounded-lg px-3 py-2 text-slate-300 focus:ring-1 focus:ring-emerald-500"
                                            onChange={(e) => {
                                                const tmpl = templates.find(t => t.id === e.target.value);
                                                if (tmpl) applyTemplate(tmpl);
                                            }}
                                            defaultValue=""
                                        >
                                            <option value="" disabled>定型文を選択...</option>
                                            {templates.map(t => (
                                                <option key={t.id} value={t.id}>{t.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">件名 (タイトル)</label>
                                        <input
                                            type="text"
                                            value={subject}
                                            onChange={e => setSubject(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                                            placeholder="例: 重要なお知らせ"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">本文</label>
                                        <textarea
                                            value={body}
                                            onChange={e => setBody(e.target.value)}
                                            rows={6}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                                            placeholder="メッセージの内容を入力してください..."
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* 送信設定 */}
                            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <Send className="w-4 h-4 text-slate-400" />
                                    送信オプション
                                </h2>

                                <div className="flex gap-4 p-1 bg-slate-950 rounded-lg w-fit border border-slate-800">
                                    <button
                                        onClick={() => setTargetMode("broadcast")}
                                        className={`px-4 py-2 rounded-md text-sm transition-all ${targetMode === "broadcast" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20" : "text-slate-400 hover:text-white"}`}
                                    >
                                        一斉送信
                                    </button>
                                    <button
                                        onClick={() => setTargetMode("individual")}
                                        className={`px-4 py-2 rounded-md text-sm transition-all ${targetMode === "individual" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20" : "text-slate-400 hover:text-white"}`}
                                    >
                                        個別送信
                                    </button>
                                </div>

                                {targetMode === "individual" && (
                                    <div className="mt-4 p-4 border border-slate-800 rounded-xl bg-slate-950/50">
                                        <div className="text-xs text-slate-400 mb-2 flex justify-between">
                                            <span>送信先ユーザーを選択 ({selectedUserIds.length}名)</span>
                                            <button
                                                onClick={() => setSelectedUserIds([])}
                                                className="text-emerald-400 hover:underline"
                                            >
                                                リセット
                                            </button>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                                            {users.map(user => (
                                                <label
                                                    key={user.user_id}
                                                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors border ${selectedUserIds.includes(user.user_id) ? "bg-emerald-900/20 border-emerald-500/50" : "bg-slate-900 border-slate-800 hover:border-slate-700"}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedUserIds.includes(user.user_id) ? "bg-emerald-500 border-emerald-500" : "border-slate-600"}`}>
                                                            {selectedUserIds.includes(user.user_id) && <CheckCircle className="w-3 h-3 text-white" />}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium">{user.username || "No Name"}</div>
                                                            {user.email && <div className="text-xs text-slate-500">{user.email}</div>}
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={selectedUserIds.includes(user.user_id)}
                                                        onChange={() => toggleUserSelection(user.user_id)}
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-slate-800 flex justify-end">
                                    <button
                                        onClick={handleSend}
                                        disabled={sending}
                                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20"
                                    >
                                        {sending ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                                送信中...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4" />
                                                送信を実行
                                            </>
                                        )}
                                    </button>
                                </div>
                            </section>
                        </div>

                        {/* 右カラム: 定型文管理 & 履歴 */}
                        <div className="space-y-6">
                            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col h-full">
                                <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                                    <Save className="w-4 h-4 text-slate-400" />
                                    定型文の管理
                                </h2>
                                <div className="flex-1 space-y-3">
                                    {templates.map(tmpl => (
                                        <div key={tmpl.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors group relative">
                                            <div className="text-xs text-emerald-400 mb-1">{tmpl.is_system ? "システム" : "カスタム"}</div>
                                            <div className="font-medium text-sm mb-1">{tmpl.title}</div>
                                            <div className="text-xs text-slate-500 line-clamp-2">{tmpl.body}</div>
                                            {!tmpl.is_system && (
                                                <button className="absolute top-2 right-2 p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button className="w-full py-3 border border-dashed border-slate-700 rounded-lg text-slate-500 hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-900/10 transition-all flex items-center justify-center gap-2 text-sm">
                                        <Plus className="w-4 h-4" />
                                        定型文を追加
                                    </button>
                                </div>
                            </section>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
