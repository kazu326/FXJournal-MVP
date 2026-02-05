import { useState, useEffect } from "react";
import { Send, Plus, CheckCircle, Loader2, X } from "lucide-react";
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

    // Template Creation State
    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState("");

    // Mock Templates (後でDB化)
    const [templates, setTemplates] = useState<TemplateRow[]>([
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
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) throw new Error("Not authenticated");

            if (targetMode === "broadcast") {
                // Announcements (Broadcast)
                const { data, error } = await supabase
                    .from("announcements")
                    .insert([{
                        title: subject,
                        body: body
                    }])
                    .select()
                    .single();

                if (error) throw error;

                // Call Push Edge Function
                const { data: pushData, error: pushError } = await supabase.functions.invoke("push-notification", {
                    body: {
                        type: "announcements",
                        id: data.id,
                        title: subject,
                        body: body
                    }
                });

                if (pushError) console.error("Push Function Error:", pushError);
                else console.log("Push Function Payload:", pushData);

            } else {
                // Individual DMs
                const messagesToInsert = selectedUserIds.map(recipientId => ({
                    sender_user_id: currentUser.id,
                    recipient_user_id: recipientId,
                    body: `【${subject}】\n\n${body}`, // DMにはタイトルがないので本文に含める
                    created_at: new Date().toISOString()
                }));

                const { data, error } = await supabase
                    .from("dm_messages")
                    .insert(messagesToInsert)
                    .select();

                if (error) throw error;

                if (data) {
                    await Promise.all(data.map(async (msg) => {
                        const { data: pushData, error: pushError } = await supabase.functions.invoke("push-notification", {
                            body: {
                                type: "dm",
                                id: msg.id,
                                title: subject,
                                body: msg.body,
                                userIds: [msg.recipient_user_id]
                            }
                        });
                        if (pushError) console.error("Push Function Error:", pushError);
                        else console.log("Push Function Payload (Individual):", pushData);
                    }));
                }
            }

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

    const handleCreateTemplate = () => {
        if (!newTemplateName.trim()) {
            toast.error("マクロ名を入力してください");
            return;
        }
        const newTemplate: TemplateRow = {
            id: Date.now().toString(),
            title: subject || "No Title",
            body: body || "",
            is_system: false
        };
        setTemplates([...templates, newTemplate]);
        setIsCreatingTemplate(false);
        setNewTemplateName("");
        toast.success("マクロを保存しました");
    };

    const startTemplateCreation = () => {
        if (!body.trim()) {
            toast.error("本文が空の状態でマクロは作成できません");
            return;
        }
        setIsCreatingTemplate(true);
        // Default name to subject or generic
        setNewTemplateName(subject || "New Macro");
    };

    return (
        <div className="min-h-screen bg-[#050B14] text-slate-300 font-sans selection:bg-cyan-900/50">
            {/* Ambient Grid Background */}
            <div className="fixed inset-0 opacity-20 pointer-events-none mix-blend-overlay"></div>

            <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6 relative z-10">
                <header className="flex items-center justify-between border-b border-slate-800/60 pb-4">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-emerald-500 rounded-sm"></span>
                            MESSAGE CONSOLE
                        </h1>
                        <p className="text-xs text-slate-500 font-mono mt-1 tracking-wider uppercase">
                            Admin Command Interface // v2.1.0
                        </p>
                    </div>
                    {/* Status Indicator */}
                    <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-800">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] font-mono text-emerald-500 font-bold">SYSTEM ONLINE</span>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {loading ? (
                        <div className="col-span-12 py-32 flex flex-col items-center justify-center gap-4">
                            <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                            <span className="font-mono text-xs text-cyan-500 animate-pulse">INITIALIZING DATA STREAMS...</span>
                        </div>
                    ) : (
                        <>
                            {/* Main Control Panel (8/12) */}
                            <div className="lg:col-span-8 flex flex-col gap-6">
                                {/* Composition Area */}
                                <section className="group relative rounded-lg border border-slate-800 bg-[#0A101D] shadow-xl overflow-hidden">
                                    {/* Technical Header Line */}
                                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500/50 to-transparent"></div>

                                    <div className="p-1.5 bg-[#0F1623] border-b border-slate-800 flex items-center justify-between">
                                        <div className="flex items-center gap-2 px-3">
                                            <span className="text-[10px] font-mono text-slate-500 uppercase">Input Source</span>
                                        </div>
                                        <select
                                            className="!bg-[#050B14] !border !border-slate-700/50 rounded-md px-3 py-1 text-xs !text-slate-300 focus:border-cyan-500/50 focus:ring-0 outline-none transition-all font-mono"
                                            onChange={(e) => {
                                                const tmpl = templates.find(t => t.id === e.target.value);
                                                if (tmpl) applyTemplate(tmpl);
                                            }}
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Load Template...</option>
                                            {templates.map(t => (
                                                <option key={t.id} value={t.id}>{t.title}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="p-5 space-y-5">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono pl-1">
                                                Subject Line
                                            </label>
                                            <input
                                                type="text"
                                                value={subject}
                                                onChange={e => setSubject(e.target.value)}
                                                className="w-full !bg-[#050B14] !border !border-slate-800 rounded-md px-4 py-2.5 text-sm !text-white placeholder:text-slate-700/50 focus:!border-cyan-500/50 focus:!bg-[#0A101D] focus:ring-0 transition-all font-medium"
                                                placeholder="Enter notification title..."
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono pl-1 flex justify-between">
                                                <span>Body Content</span>
                                                <span className="text-slate-700">{body.length} chars</span>
                                            </label>
                                            <textarea
                                                value={body}
                                                onChange={e => setBody(e.target.value)}
                                                rows={6}
                                                className="w-full !bg-[#050B14] !border !border-slate-800 rounded-md px-4 py-3 text-sm !text-white placeholder:text-slate-700/50 focus:!border-cyan-500/50 focus:!bg-[#0A101D] focus:ring-0 transition-all font-medium resize-y custom-scrollbar"
                                                placeholder="Enter message details..."
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* Target Control & Execution */}
                                <section className="relative rounded-lg border border-slate-800 bg-[#0A101D] shadow-xl p-5">
                                    <div className="flex flex-col md:flex-row gap-6 items-end justify-between">

                                        {/* Segmented Control for Target */}
                                        <div className="w-full md:w-auto space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono pl-1">
                                                Target Selection
                                            </label>
                                            <div className="flex !bg-[#050B14] p-1 rounded-md !border !border-slate-800 w-fit">
                                                <button
                                                    onClick={() => setTargetMode("broadcast")}
                                                    className={`px-6 py-1.5 rounded text-xs font-bold transition-all ${targetMode === "broadcast"
                                                        ? "!bg-slate-700 text-white shadow-sm"
                                                        : "!bg-transparent text-slate-500 hover:text-slate-300"
                                                        }`}
                                                >
                                                    BROADCAST
                                                </button>
                                                <button
                                                    onClick={() => setTargetMode("individual")}
                                                    className={`px-6 py-1.5 rounded text-xs font-bold transition-all ${targetMode === "individual"
                                                        ? "!bg-slate-700 text-white shadow-sm"
                                                        : "!bg-transparent text-slate-500 hover:text-slate-300"
                                                        }`}
                                                >
                                                    INDIVIDUAL
                                                </button>
                                            </div>
                                        </div>

                                        {/* Execute Button */}
                                        <div className="w-full md:w-auto">
                                            <button
                                                onClick={handleSend}
                                                disabled={sending}
                                                className="w-full md:w-auto overflow-hidden group relative !bg-emerald-600 hover:!bg-emerald-500 text-white px-8 py-2.5 rounded-md font-bold text-xs tracking-widest disabled:opacity-50 disabled:cursor-not-allowed transition-all active:translate-y-0.5"
                                            >
                                                {/* Button Decoration */}
                                                <div className="absolute top-0 right-0 -mr-4 -mt-4 w-8 h-8 bg-white opacity-10 rotate-45 transform group-hover:translate-x-1 transition-transform"></div>

                                                <span className="relative flex items-center gap-2 justify-center">
                                                    {sending ? (
                                                        <>
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            EXECUTING...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Send className="w-3.5 h-3.5" />
                                                            EXECUTE SEND
                                                        </>
                                                    )}
                                                </span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Individual User Selector (Conditional) */}
                                    {targetMode === "individual" && (
                                        <div className="mt-6 border-t border-slate-800 pt-4 animate-fade-in">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[10px] font-mono text-cyan-500">
                                                    SELECTED: {selectedUserIds.length} USERS
                                                </span>
                                                <button
                                                    onClick={() => setSelectedUserIds([])}
                                                    className="!bg-transparent text-[10px] text-slate-500 hover:text-red-400 font-mono transition-colors"
                                                >
                                                    [選択解除]
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                                {users.map(user => (
                                                    <div
                                                        key={user.user_id}
                                                        onClick={() => toggleUserSelection(user.user_id)}
                                                        className={`flex items-center gap-3 p-2 rounded border transition-all cursor-pointer ${selectedUserIds.includes(user.user_id)
                                                            ? "bg-cyan-900/10 border-cyan-500/30"
                                                            : "bg-[#050B14] border-slate-800 hover:border-slate-700"
                                                            }`}
                                                    >
                                                        <div className={`w-3 h-3 rounded-sm border flex items-center justify-center transition-colors ${selectedUserIds.includes(user.user_id)
                                                            ? "bg-cyan-500 border-cyan-500"
                                                            : "border-slate-600 bg-transparent"
                                                            }`}>
                                                            {selectedUserIds.includes(user.user_id) && <div className="w-1.5 h-1.5 bg-black" />}
                                                        </div>
                                                        <div className="truncate">
                                                            <div className={`text-xs font-mono font-medium truncate ${selectedUserIds.includes(user.user_id) ? "text-cyan-400" : "text-slate-400"}`}>
                                                                {user.username || "UNKNOWN_UNIT"}
                                                            </div>
                                                            <div className="text-[10px] text-slate-600 truncate font-mono">{user.email?.split('@')[0]}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </section>
                            </div>

                            {/* Sidebar Panels (4/12) */}
                            <div className="lg:col-span-4 flex flex-col gap-6">
                                {/* Quick Templates */}
                                <section className="flex-1 rounded-lg border border-slate-800 bg-[#0A101D] shadow-xl p-4 flex flex-col">
                                    <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
                                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
                                            Quick Macros
                                        </h2>
                                        <button
                                            onClick={startTemplateCreation}
                                            className="p-1 hover:bg-slate-800 rounded transition-colors"
                                        >
                                            <Plus className="w-4 h-4 text-slate-600 hover:text-emerald-500 transition-colors" />
                                        </button>
                                    </div>

                                    <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
                                        {isCreatingTemplate && (
                                            <div className="p-3 rounded bg-[#0F1623] border border-emerald-500/50 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <div className="mb-2">
                                                    <label className="text-[9px] font-mono text-emerald-500 block mb-1">MACRO NAME</label>
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={newTemplateName}
                                                        onChange={(e) => setNewTemplateName(e.target.value)}
                                                        className="w-full bg-[#050B14] border border-slate-700 text-xs text-white px-2 py-1 rounded focus:border-emerald-500 focus:outline-none font-mono"
                                                    />
                                                </div>
                                                <div className="flex gap-2 justify-end">
                                                    <button
                                                        onClick={() => setIsCreatingTemplate(false)}
                                                        className="p-1 text-slate-500 hover:text-red-400"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={handleCreateTemplate}
                                                        className="p-1 text-emerald-500 hover:text-emerald-400"
                                                    >
                                                        <CheckCircle className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {templates.map(tmpl => (
                                            <div
                                                key={tmpl.id}
                                                onClick={() => applyTemplate(tmpl)}
                                                className="cursor-pointer group relative p-3 rounded bg-[#0F1623] border border-slate-800 hover:border-cyan-500/30 hover:bg-[#131b2c] transition-all"
                                            >
                                                {/* Tech Marker */}
                                                <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-slate-700 group-hover:bg-cyan-500 transition-colors rounded-r-md"></div>

                                                <div className="flex justify-between items-start mb-1 pl-2">
                                                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm border ${tmpl.is_system
                                                        ? "border-purple-500/30 text-purple-400 bg-purple-500/10"
                                                        : "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                                                        }`}>
                                                        {tmpl.is_system ? "SYS" : "USR"}
                                                    </span>
                                                </div>
                                                <div className="font-bold text-slate-300 text-xs pl-2 group-hover:text-cyan-300 transition-colors">
                                                    {tmpl.title}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
