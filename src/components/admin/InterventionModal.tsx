import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { supabase } from '../../lib/supabase';

interface InterventionModalProps {
    users: { id: string; email: string | null; }[];
    triggerReason: string;
    open: boolean;
    onClose: () => void;
}

export const InterventionModal = ({ users, triggerReason, open, onClose }: InterventionModalProps) => {
    const [selectedAction, setSelectedAction] = useState('');
    const [customMessage, setCustomMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const actionTemplates: Record<string, { label: string; template: string; expectedOutcome: string }> = {
        retention_email: {
            label: 'リテンションメール送信',
            template: '最近ログインされていませんが、お困りのことはありませんか？サポートが必要な場合はお気軽にご連絡ください。',
            expectedOutcome: 'ログイン再開、継続率向上'
        },
        onboarding_call: {
            label: 'オンボーディング電話',
            template: '初期設定のサポートが必要な方へ個別サポートを提供します。',
            expectedOutcome: '学習開始率向上'
        },
        course_recommendation: {
            label: 'コース推奨',
            template: 'あなたのトレードスタイルに合った学習コンテンツをご提案します。',
            expectedOutcome: '学習進捗率向上、行動改善'
        },
        discount_offer: {
            label: '特別割引提供',
            template: '継続割引を提供してリテンションを促進します。',
            expectedOutcome: '解約防止'
        },
        custom_message: {
            label: 'カスタムメッセージ',
            template: '',
            expectedOutcome: 'その他'
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const user = (await supabase.auth.getUser()).data.user;

            // 各ユーザーに対して施策を記録
            for (const targetUser of users) {
                await supabase.from('interventions').insert({
                    user_id: targetUser.id,
                    intervention_type: selectedAction,
                    trigger_reason: triggerReason,
                    action_taken: customMessage || actionTemplates[selectedAction].template,
                    expected_outcome: actionTemplates[selectedAction].expectedOutcome,
                    status: 'completed',
                    executed_by: user?.id
                });
            }

            alert('施策を実施しました');
            onClose();
        } catch (error) {
            console.error(error);
            alert('エラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl text-slate-100 bg-slate-900 border-slate-800">
                <DialogHeader>
                    <DialogTitle>施策を実施する</DialogTitle>
                    <p className="text-sm text-gray-400">{users.length}名のユーザーに対するアクション</p>
                </DialogHeader>

                <div className="space-y-4">
                    <Alert variant="warning" className="bg-amber-500/10 border-amber-500/20 text-amber-500">
                        <AlertTitle>検出された問題</AlertTitle>
                        <AlertDescription>{triggerReason}</AlertDescription>
                    </Alert>

                    <div>
                        <h4 className="text-sm font-semibold mb-2">対象ユーザー</h4>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                            {users.map(user => (
                                <div key={user.id} className="px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-300 border border-slate-700">
                                    {user.email || 'No Email'}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold">施策タイプ</label>
                        <Select value={selectedAction} onValueChange={setSelectedAction}>
                            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                                <SelectValue placeholder="実施する施策を選択" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                                {Object.entries(actionTemplates).map(([key, action]) => (
                                    <SelectItem key={key} value={key} className="focus:bg-slate-700 focus:text-slate-100">
                                        {action.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedAction && (
                        <div className="space-y-2">
                            <label className="text-sm font-semibold">施策内容</label>
                            <Textarea
                                value={customMessage || actionTemplates[selectedAction].template}
                                onChange={(e) => setCustomMessage(e.target.value)}
                                rows={4}
                                className="w-full bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-600"
                            />
                            <p className="text-xs text-gray-400">
                                期待される成果: {actionTemplates[selectedAction].expectedOutcome}
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                            キャンセル
                        </Button>
                        <Button onClick={handleSubmit} disabled={!selectedAction || loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {loading ? '実施中...' : '施策を実行'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
