import { supabase } from "../../lib/supabase";
import type {
  Announcement,
  CheckinAssignment,
  CheckinQuestion,
  EvidenceCard,
  FeedbackSignal,
  FeedbackStatus,
  LegacyMessage,
  MonthlyFeedback,
  SupportCategory,
  SupportMessage,
  SupportThread,
  SupportThreadStatus,
} from "./types";

type SupabaseErrorLike = {
  message?: string;
};

function throwIfError(error: SupabaseErrorLike | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  return (data as T | null) ?? null;
}

export async function ensureCurrentMonthCheckin() {
  const { data, error } = await supabase.rpc("ensure_current_month_checkin");
  throwIfError(error, "今月のチェックインを準備できませんでした。");
  const assignment = firstRow<CheckinAssignment>(data);
  if (!assignment) throw new Error("今月のチェックインが見つかりませんでした。");
  return assignment;
}

export async function loadCheckinQuestions(definitionId: string) {
  const { data, error } = await supabase
    .from("checkin_questions")
    .select(
      "id, definition_id, question_key, position, prompt, low_label, high_label, allow_not_applicable",
    )
    .eq("definition_id", definitionId)
    .order("position", { ascending: true });
  throwIfError(error, "チェックインの設問を取得できませんでした。");
  return (data ?? []) as CheckinQuestion[];
}

export async function loadMonthlyFeedback(assignmentId: string) {
  const { data, error } = await supabase
    .from("monthly_feedback")
    .select(
      "id, assignment_id, user_id, period_start, signal, status, summary, interpretation, next_action, evidence_card_id, created_at",
    )
    .eq("assignment_id", assignmentId)
    .maybeSingle();
  throwIfError(error, "フィードバックを取得できませんでした。");
  return (data as MonthlyFeedback | null) ?? null;
}

export async function loadEvidenceCard(evidenceCardId: string | null) {
  if (!evidenceCardId) return null;
  const { data, error } = await supabase
    .from("evidence_cards")
    .select(
      "id, title, evidence_kind, source_name, source_year, source_url, summary, scope_note, limitation_note",
    )
    .eq("id", evidenceCardId)
    .maybeSingle();
  throwIfError(error, "根拠カードを取得できませんでした。");
  return (data as EvidenceCard | null) ?? null;
}

export async function submitMonthlyCheckin(
  assignmentId: string,
  answers: Record<string, number | null>,
  supportRequested: boolean,
) {
  const { data, error } = await supabase.rpc("submit_monthly_checkin", {
    p_assignment_id: assignmentId,
    p_answers: answers,
    p_support_requested: supportRequested,
  });
  throwIfError(error, "チェックインを保存できませんでした。");
  const result = firstRow<{
    feedback_id: string;
    feedback_status: FeedbackStatus;
    feedback_signal: FeedbackSignal;
  }>(data);
  if (!result) throw new Error("チェックインの保存結果を確認できませんでした。");
  return result;
}

export async function loadLatestSupportThread(userId: string) {
  const { data, error } = await supabase
    .from("support_threads")
    .select(
      "id, member_user_id, organization_id, category, subject, status, assigned_staff_user_id, last_message_at, created_at",
    )
    .eq("member_user_id", userId)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfError(error, "相談状況を取得できませんでした。");
  return (data as SupportThread | null) ?? null;
}

export async function loadSupportMessages(threadId: string) {
  const { data, error } = await supabase
    .from("support_messages")
    .select("id, thread_id, sender_user_id, sender_kind, body, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  throwIfError(error, "相談メッセージを取得できませんでした。");
  return (data ?? []) as SupportMessage[];
}

export async function openSupportThread(
  category: SupportCategory,
  subject: string,
  body: string,
) {
  const { data, error } = await supabase.rpc("open_support_thread", {
    p_category: category,
    p_subject: subject,
    p_body: body,
  });
  throwIfError(error, "相談を開始できませんでした。");
  const thread = firstRow<SupportThread>(data);
  if (!thread) throw new Error("相談の作成結果を確認できませんでした。");
  return thread;
}

export async function postSupportMessage(threadId: string, body: string) {
  const { data, error } = await supabase.rpc("post_support_message", {
    p_thread_id: threadId,
    p_body: body,
  });
  throwIfError(error, "メッセージを送信できませんでした。");
  const message = firstRow<SupportMessage>(data);
  if (!message) throw new Error("送信結果を確認できませんでした。");
  const { error: pushError } = await supabase.functions.invoke(
    "push-notification",
    {
      body: { type: "support", id: message.id },
    },
  );
  if (pushError) {
    console.warn("相談メッセージは保存されましたが、Push通知に失敗しました。", pushError);
  }
  return message;
}

export async function setSupportThreadStatus(
  threadId: string,
  status: SupportThreadStatus,
) {
  const { data, error } = await supabase.rpc("set_support_thread_status", {
    p_thread_id: threadId,
    p_status: status,
  });
  throwIfError(error, "相談状態を更新できませんでした。");
  const thread = firstRow<SupportThread>(data);
  if (!thread) throw new Error("相談状態を確認できませんでした。");
  return thread;
}

export async function loadAnnouncementsAndLegacyMessages(userId: string) {
  const [announcementResult, legacyResult] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, body, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("dm_messages")
      .select("id, body, created_at")
      .or(`recipient_user_id.eq.${userId},recipient_user_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  throwIfError(announcementResult.error, "お知らせを取得できませんでした。");
  throwIfError(legacyResult.error, "過去のメッセージを取得できませんでした。");

  return {
    announcements: (announcementResult.data ?? []) as Announcement[],
    legacyMessages: (legacyResult.data ?? []) as LegacyMessage[],
  };
}

export type AdminMemberProfile = {
  user_id: string;
  display_name: string | null;
  email: string | null;
};

export async function loadAdminCareData() {
  const [threadsResult, feedbackResult, summaryResult] = await Promise.all([
    supabase
      .from("support_threads")
      .select(
        "id, member_user_id, organization_id, category, subject, status, assigned_staff_user_id, last_message_at, created_at",
      )
      .order("last_message_at", { ascending: false })
      .limit(100),
    supabase
      .from("monthly_feedback")
      .select(
        "id, assignment_id, user_id, period_start, signal, status, summary, interpretation, next_action, evidence_card_id, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("v_monthly_checkin_org_summary")
      .select(
        "organization_id, period_start, assigned_count, response_count, average_answer, followup_count",
      )
      .order("period_start", { ascending: false })
      .limit(12),
  ]);

  throwIfError(threadsResult.error, "相談一覧を取得できませんでした。");
  throwIfError(feedbackResult.error, "月次レビューを取得できませんでした。");
  throwIfError(summaryResult.error, "月次集計を取得できませんでした。");

  const threads = (threadsResult.data ?? []) as SupportThread[];
  const feedback = (feedbackResult.data ?? []) as MonthlyFeedback[];
  const userIds = Array.from(
    new Set([
      ...threads.map((thread) => thread.member_user_id),
      ...feedback.map((item) => item.user_id),
    ]),
  );

  let profiles: AdminMemberProfile[] = [];
  if (userIds.length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, email")
      .in("user_id", userIds);
    throwIfError(error, "ユーザー情報を取得できませんでした。");
    profiles = (data ?? []) as AdminMemberProfile[];
  }

  return {
    threads,
    feedback,
    summary: (summaryResult.data ?? []) as Array<{
      organization_id: string | null;
      period_start: string;
      assigned_count: number;
      response_count: number;
      average_answer: number | null;
      followup_count: number;
    }>,
    profiles,
  };
}

export async function publishMonthlyFeedback(feedbackId: string) {
  const { data, error } = await supabase.rpc("publish_monthly_feedback", {
    p_feedback_id: feedbackId,
  });
  throwIfError(error, "フィードバックを公開できませんでした。");
  const feedback = firstRow<MonthlyFeedback>(data);
  if (!feedback) throw new Error("公開結果を確認できませんでした。");
  const { error: pushError } = await supabase.functions.invoke(
    "push-notification",
    {
      body: { type: "monthly_feedback", id: feedback.id },
    },
  );
  if (pushError) {
    console.warn("フィードバックは公開されましたが、Push通知に失敗しました。", pushError);
  }
  return feedback;
}

export async function publishAnnouncement(
  createdBy: string,
  title: string,
  body: string,
) {
  const { data, error } = await supabase
    .from("announcements")
    .insert([
      {
        title,
        body,
        published_at: new Date().toISOString(),
        created_by: createdBy,
      },
    ])
    .select("id")
    .single();
  throwIfError(error, "お知らせを公開できませんでした。");

  const announcementId = (data as { id?: string } | null)?.id;
  if (!announcementId) throw new Error("お知らせIDを確認できませんでした。");

  const { error: pushError } = await supabase.functions.invoke(
    "push-notification",
    {
      body: { type: "announcements", id: announcementId },
    },
  );
  if (pushError) {
    console.warn("お知らせは公開されましたが、Push通知に失敗しました。", pushError);
  }

  return announcementId;
}
