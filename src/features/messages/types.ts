export type CheckinStatus = "due" | "completed" | "expired";

export type FeedbackSignal =
  | "on_track"
  | "monitoring"
  | "followup"
  | "support_requested"
  | "insufficient_data";

export type FeedbackStatus = "draft" | "published" | "suppressed";

export type SupportCategory =
  | "record_habit"
  | "rule_adherence"
  | "emotion_management"
  | "skip_decision"
  | "learning"
  | "app_usage";

export type SupportThreadStatus =
  | "open"
  | "waiting_staff"
  | "waiting_member"
  | "resolved"
  | "closed";

export type CheckinAssignment = {
  id: string;
  definition_id: string;
  user_id: string;
  organization_id: string | null;
  period_start: string;
  period_end: string;
  due_at: string;
  status: CheckinStatus;
  support_requested: boolean;
  completed_at: string | null;
};

export type CheckinQuestion = {
  id: string;
  definition_id: string;
  question_key: string;
  position: number;
  prompt: string;
  low_label: string;
  high_label: string;
  allow_not_applicable: boolean;
};

export type EvidenceCard = {
  id: string;
  title: string;
  evidence_kind:
    | "meta_analysis"
    | "experiment"
    | "observational"
    | "app_data"
    | "hypothesis";
  source_name: string;
  source_year: number | null;
  source_url: string;
  summary: string;
  scope_note: string;
  limitation_note: string;
};

export type MonthlyFeedback = {
  id: string;
  assignment_id: string;
  user_id: string;
  period_start: string;
  signal: FeedbackSignal;
  status: FeedbackStatus;
  summary: string;
  interpretation: string;
  next_action: string;
  evidence_card_id: string | null;
  created_at: string;
};

export type SupportThread = {
  id: string;
  member_user_id: string;
  organization_id: string | null;
  category: SupportCategory;
  subject: string;
  status: SupportThreadStatus;
  assigned_staff_user_id: string | null;
  last_message_at: string;
  created_at: string;
};

export type SupportMessage = {
  id: string;
  thread_id: string;
  sender_user_id: string | null;
  sender_kind: "member" | "staff" | "system";
  body: string;
  created_at: string;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

export type LegacyMessage = {
  id: string;
  body: string;
  created_at: string;
};

export const supportCategoryLabels: Record<SupportCategory, string> = {
  record_habit: "記録の続け方",
  rule_adherence: "ルールを守る工夫",
  emotion_management: "感情が動いたときの対処",
  skip_decision: "見送りの判断",
  learning: "学習の進め方",
  app_usage: "アプリの使い方",
};

export const supportStatusLabels: Record<SupportThreadStatus, string> = {
  open: "対応中",
  waiting_staff: "担当者の返信待ち",
  waiting_member: "あなたの返信待ち",
  resolved: "解決済み",
  closed: "終了",
};

export const feedbackSignalLabels: Record<FeedbackSignal, string> = {
  on_track: "継続できている",
  monitoring: "変化を確認中",
  followup: "フォロー候補",
  support_requested: "本人から相談希望",
  insufficient_data: "データ不足",
};
