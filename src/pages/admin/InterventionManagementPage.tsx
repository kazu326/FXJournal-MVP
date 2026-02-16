import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { DashboardSummaryCard } from "./components/DashboardSummaryCard";
import { InterventionModal } from "../../components/admin/InterventionModal";
import {
    Users,
    AlertTriangle,
    CheckCircle,
    Search,
    Clock,
    Activity
} from "lucide-react";
import { Button } from "../../components/ui/button";

interface ComplianceUserData {
    user_id: string;
    email: string;
    subscription_status: string;
    last_learning_date: string | null;
    learning_completion_rate: number;
    intervention_count: number;
    last_intervention_date: string | null;
    last_intervention_type: string | null;
    improvement_percent: number | null;
}

export const InterventionManagementPage = () => {
    const [users, setUsers] = useState<ComplianceUserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [riskFilter, setRiskFilter] = useState<"all" | "high" | "medium" | "low">("all");

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTriggerReason, setModalTriggerReason] = useState("");

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('v_compliance_report_with_interventions')
                .select('*');

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleUserSelection = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleBulkIntervention = () => {
        if (selectedUsers.length === 0) return;
        setModalTriggerReason("管理者による手動選択");
        setModalOpen(true);
    };

    const getRiskLevel = (user: ComplianceUserData): "high" | "medium" | "low" => {
        if (user.subscription_status !== 'active') return 'high';
        if (!user.last_learning_date) return 'high';
        if (user.learning_completion_rate < 50) return 'medium';
        return 'low';
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const riskLevel = getRiskLevel(user);
        const matchesRisk = riskFilter === 'all' || riskLevel === riskFilter;
        return matchesSearch && matchesRisk;
    });

    const highRiskCount = users.filter(u => getRiskLevel(u) === 'high').length;
    const interventionNeededCount = users.filter(u => !u.last_intervention_date && getRiskLevel(u) !== 'low').length;

    return (
        <div className="p-8 space-y-8 bg-slate-950 min-h-screen text-slate-100">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        施策管理センター
                    </h1>
                    <p className="text-slate-400 mt-2">
                        ユーザーの行動変容を促すための施策を実行・管理します
                    </p>
                </div>
                <div className="flex gap-4">
                    <Button
                        onClick={handleBulkIntervention}
                        disabled={selectedUsers.length === 0}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        選択したユーザーに施策を実施 ({selectedUsers.length})
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <DashboardSummaryCard
                    title="要対応ユーザー"
                    value={highRiskCount}
                    subLabel="高リスク群"
                    icon={AlertTriangle}
                    color="rose"
                    severity={highRiskCount > 0 ? 'danger' : 'info'}
                    onClick={() => setRiskFilter('high')}
                    clickable={true}
                />
                <DashboardSummaryCard
                    title="未実施の施策"
                    value={interventionNeededCount}
                    subLabel="アクション推奨"
                    icon={Activity}
                    color="amber"
                    severity={interventionNeededCount > 0 ? 'warning' : 'info'}
                    onClick={() => {
                        setRiskFilter('all');
                        // filtering logic could be more complex
                    }}
                    clickable={true}
                />
                <DashboardSummaryCard
                    title="実施済み施策"
                    value={users.reduce((sum, u) => sum + (u.intervention_count || 0), 0)}
                    subLabel="累計"
                    icon={CheckCircle}
                    color="emerald"
                />
                <DashboardSummaryCard
                    title="対象ユーザー総数"
                    value={users.length}
                    icon={Users}
                    color="blue"
                />
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="メールアドレスで検索..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800 border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div className="flex gap-2">
                    {(['all', 'high', 'medium', 'low'] as const).map(filter => (
                        <button
                            key={filter}
                            onClick={() => setRiskFilter(filter)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${riskFilter === filter
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                        >
                            {filter === 'all' ? '全て' : filter.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* User List */}
            <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-800/50 text-slate-400 text-sm">
                            <th className="p-4 w-12 text-center">
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-600 bg-slate-700"
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedUsers(filteredUsers.map(u => u.user_id));
                                        } else {
                                            setSelectedUsers([]);
                                        }
                                    }}
                                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                                />
                            </th>
                            <th className="p-4 font-medium">ユーザー</th>
                            <th className="p-4 font-medium">学習進捗</th>
                            <th className="p-4 font-medium">最終施策</th>
                            <th className="p-4 font-medium">リスクレベル</th>
                            <th className="p-4 font-medium">アクション</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        <AnimatePresence>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        読み込み中...
                                    </td>
                                </tr>
                            ) : filteredUsers.map((user) => (
                                <motion.tr
                                    key={user.user_id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className={`hover:bg-slate-800/30 transition-colors ${selectedUsers.includes(user.user_id) ? 'bg-blue-900/10' : ''
                                        }`}
                                >
                                    <td className="p-4 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.includes(user.user_id)}
                                            onChange={() => toggleUserSelection(user.user_id)}
                                            className="rounded border-slate-600 bg-slate-700"
                                        />
                                    </td>
                                    <td className="p-4">
                                        <div className="font-medium text-slate-200">{user.email}</div>
                                        <div className="text-xs text-slate-500">ID: {user.user_id.slice(0, 8)}...</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500"
                                                    style={{ width: `${user.learning_completion_rate}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-slate-400">
                                                {user.learning_completion_rate}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {user.last_intervention_date ? (
                                            <div>
                                                <div className="text-sm text-slate-300">
                                                    {user.last_intervention_type}
                                                </div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(user.last_intervention_date).toLocaleDateString()}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-slate-600 text-sm">-</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevel(user) === 'high'
                                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                            : getRiskLevel(user) === 'medium'
                                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                            }`}>
                                            {getRiskLevel(user).toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <Button
                                            className="h-8 px-3 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300"
                                            onClick={() => {
                                                setSelectedUsers([user.user_id]);
                                                setModalTriggerReason("個別対応");
                                                setModalOpen(true);
                                            }}
                                        >
                                            施策を実行
                                        </Button>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>

            <InterventionModal
                open={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setSelectedUsers([]);
                    fetchUsers(); // Refresh data after intervention
                }}
                users={users.filter(u => selectedUsers.includes(u.user_id)).map(u => ({ id: u.user_id, email: u.email }))}
                triggerReason={modalTriggerReason}
            />
        </div>
    );
};
