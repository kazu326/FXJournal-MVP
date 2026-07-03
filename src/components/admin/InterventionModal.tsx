import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { supabase } from '../../lib/supabase';

type InterventionTriggerType =
    | 'overtrading'
    | 'rule_violation'
    | 'no_skip_discipline'
    | 'learning_stall'
    | 'record_inactivity';

interface InterventionModalProps {
    users: { id: string; email: string | null; }[];
    open: boolean;
    onClose: () => void;
}

const triggerOptions: Array<{ value: InterventionTriggerType; label: string; description: string }> = [
    { value: 'overtrading', label: '過剰取引', description: '取引頻度が保護基準を超えている' },
    { value: 'rule_violation', label: 'ルール違反', description: '事前ルールや Gate の違反が続いている' },
    { value: 'no_skip_discipline', label: '見送り規律の欠如', description: '見送り判断が記録されていない、または極端に少ない' },
    { value: 'learning_stall', label: '学習停滞', description: '学習進捗が止まっている' },
    { value: 'record_inactivity', label: '記録停止', description: '必要な記録が継続されていない' }
];

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

export const InterventionModal = ({ users, open, onClose }: InterventionModalProps) => {
    const [selectedTriggerType, setSelectedTriggerType] = useState<InterventionTriggerType | ''>('');
    const [triggerReason, setTriggerReason] = useState('');
    const [selectedAction, setSelectedAction] = useState('');
    const [customMessage, setCustomMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const selectedTrigger = triggerOptions.find(option => option.value === selectedTriggerType);
    const selectedTemplate = selectedAction ? actionTemplates[selectedAction] : null;

    const handleSubmit = async () => {
        if (!selectedTriggerType || !selectedTemplate) return;

        setLoading(true);
        try {
            const user = (await supabase.auth.getUser()).data.user;
            const actionTaken = customMessage || selectedTemplate.template;
            const explanation = triggerReason.trim() || null;

            const payload = users.map(targetUser => ({
                user_id: targetUser.id,
                intervention_type: selectedAction,
                trigger_type: selectedTriggerType,
                trigger_reason: explanation,
                action_taken: actionTaken,
                expected_outcome: selectedTemplate.expectedOutcome,
                status: 'completed',
                executed_by: user?.id
            }));

            const { error } = await supabase.from('interventions').insert(payload);

            if (error) throw error;

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
                        <AlertTitle>Governed trigger required</AlertTitle>
                        <AlertDescription>
                            Select one approved exit-risk trigger before recording an intervention.
                        </AlertDescription>
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
                        <label className="text-sm font-semibold">介入トリガー</label>
                        <Select value={selectedTriggerType} onValueChange={(value) => setSelectedTriggerType(value as InterventionTriggerType)}>
                            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                                <SelectValue placeholder="承認済みトリガーを選択" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                                {triggerOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value} className="focus:bg-slate-700 focus:text-slate-100">
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedTrigger && (
                            <p className="text-xs text-slate-400">{selectedTrigger.description}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold">補足説明（任意）</label>
                        <Textarea
                            value={triggerReason}
                            onChange={(e) => setTriggerReason(e.target.value)}
                            rows={2}
                            placeholder="トリガー判断の補足を記録できます"
                            className="w-full bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-600"
                        />
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

                    {selectedTemplate && (
                        <div className="space-y-2">
                            <label className="text-sm font-semibold">施策内容</label>
                            <Textarea
                                value={customMessage || selectedTemplate.template}
                                onChange={(e) => setCustomMessage(e.target.value)}
                                rows={4}
                                className="w-full bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-600"
                            />
                            <p className="text-xs text-gray-400">
                                期待される成果: {selectedTemplate.expectedOutcome}
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                            キャンセル
                        </Button>
                        <Button onClick={handleSubmit} disabled={!selectedTriggerType || !selectedTemplate || loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {loading ? '実施中...' : '施策を実行'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
