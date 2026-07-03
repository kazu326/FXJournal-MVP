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

const actionTemplates: Record<string, { label: string; template: string; expectedOutcome: string }> = {
    onboarding_call: {
        label: 'オンボーディング支援',
        template: '学習を開始または再開するために必要な個別サポートを提供します。',
        expectedOutcome: '学習への参加が改善する'
    },
    course_recommendation: {
        label: '学習コンテンツ提案',
        template: 'ユーザーの行動シグナルと現在の学習進捗に合った学習コンテンツを提案します。',
        expectedOutcome: '学習進捗と保護的な行動が改善する'
    },
    custom_message: {
        label: '教育メッセージ',
        template: '',
        expectedOutcome: '教育的支援の成果'
    },
    manual_support: {
        label: '個別学習サポート',
        template: '検出された行動リスクに基づき、個別の教育的サポートを提供します。',
        expectedOutcome: '行動リスクが低減する'
    }
};

export const InterventionModal = ({ users, triggerReason, open, onClose }: InterventionModalProps) => {
    const [selectedAction, setSelectedAction] = useState('');
    const [customMessage, setCustomMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const selectedTemplate = selectedAction ? actionTemplates[selectedAction] : null;

    const handleSubmit = async () => {
        if (!selectedTemplate) return;

        setLoading(true);
        try {
            const user = (await supabase.auth.getUser()).data.user;
            const actionTaken = customMessage || selectedTemplate.template;

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

            alert('教育的介入を記録しました。');
            onClose();
        } catch (error) {
            console.error(error);
            alert('教育的介入の記録に失敗しました。');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl text-slate-100 bg-slate-900 border-slate-800">
                <DialogHeader>
                    <DialogTitle>教育的介入を記録</DialogTitle>
                    <p className="text-sm text-gray-400">{users.length}名の対象ユーザー</p>
                </DialogHeader>

                <div className="space-y-4">
                    <Alert variant="warning" className="bg-amber-500/10 border-amber-500/20 text-amber-500">
                        <AlertTitle>検出された教育的リスク</AlertTitle>
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
                        <label className="text-sm font-semibold">介入タイプ</label>
                        <Select value={selectedAction} onValueChange={setSelectedAction}>
                            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                                <SelectValue placeholder="教育的介入を選択" />
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
                            <label className="text-sm font-semibold">介入内容</label>
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
                        <Button onClick={handleSubmit} disabled={!selectedTemplate || loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {loading ? '記録中...' : '介入を記録'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
