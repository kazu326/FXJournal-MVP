import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  ClipboardCheck,
  HeartHandshake,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import { assessOutboundMessage } from "../../features/messages/advice-guard";
import {
  loadAdminCareData,
  loadSupportMessages,
  postSupportMessage,
  publishAnnouncement,
  publishMonthlyFeedback,
  setSupportThreadStatus,
  type AdminMemberProfile,
} from "../../features/messages/api";
import {
  feedbackSignalLabels,
  supportCategoryLabels,
  supportStatusLabels,
  type MonthlyFeedback,
  type SupportMessage,
  type SupportThread,
} from "../../features/messages/types";

type AdminTab = "announcements" | "support" | "reviews";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function profileName(
  profiles: Map<string, AdminMemberProfile>,
  userId: string,
) {
  const profile = profiles.get(userId);
  return profile?.display_name || profile?.email || userId.slice(0, 8);
}

export default function AdminMessages() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("support");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [feedback, setFeedback] = useState<MonthlyFeedback[]>([]);
  const [summary, setSummary] = useState<
    Array<{
      organization_id: string | null;
      period_start: string;
      assigned_count: number;
      response_count: number;
      average_answer: number | null;
      followup_count: number;
    }>
  >([]);
  const [profiles, setProfiles] = useState<AdminMemberProfile[]>([]);

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<SupportMessage[]>([]);
  const [replyBody, setReplyBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcementGuardMessage, setAnnouncementGuardMessage] = useState<
    string | null
  >(null);
  const [replyGuardMessage, setReplyGuardMessage] = useState<string | null>(
    null,
  );

  const profileMap = useMemo(
    () => new Map(profiles.map((profile) => [profile.user_id, profile])),
    [profiles],
  );

  const selectedThread =
    threads.find((thread) => thread.id === selectedThreadId) ?? null;

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await loadAdminCareData();
      setThreads(data.threads);
      setFeedback(data.feedback);
      setSummary(data.summary);
      setProfiles(data.profiles);
      setSelectedThreadId((current) => current ?? data.threads[0]?.id ?? null);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "管理データを読み込めませんでした。",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  useEffect(() => {
    if (!selectedThreadId) {
      return;
    }
    void (async () => {
      try {
        setThreadMessages(await loadSupportMessages(selectedThreadId));
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "相談メッセージを取得できませんでした。",
        );
      }
    })();
  }, [selectedThreadId]);

  const sendAnnouncement = async () => {
    if (!user || !announcementTitle.trim() || !announcementBody.trim()) return;
    const guard = assessOutboundMessage(
      `${announcementTitle.trim()} ${announcementBody.trim()}`,
    );
    if (!guard.allowed) {
      setAnnouncementGuardMessage(guard.reason);
      toast.error("投資助言防止チェックを確認してください");
      return;
    }
    setAnnouncementGuardMessage(null);
    setSubmitting(true);
    try {
      await publishAnnouncement(
        user.id,
        announcementTitle.trim(),
        announcementBody.trim(),
      );
      setAnnouncementTitle("");
      setAnnouncementBody("");
      toast.success("お知らせを公開しました");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "お知らせを公開できませんでした。",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async () => {
    if (!selectedThread || !replyBody.trim()) return;
    const guard = assessOutboundMessage(replyBody);
    if (!guard.allowed) {
      setReplyGuardMessage(guard.reason);
      toast.error("投資助言防止チェックを確認してください");
      return;
    }
    setReplyGuardMessage(null);
    setSubmitting(true);
    try {
      await postSupportMessage(selectedThread.id, replyBody.trim());
      setReplyBody("");
      setThreadMessages(await loadSupportMessages(selectedThread.id));
      await loadData();
      toast.success("返信しました");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "返信できませんでした。",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resolveThread = async () => {
    if (!selectedThread) return;
    setSubmitting(true);
    try {
      await setSupportThreadStatus(selectedThread.id, "resolved");
      await loadData();
      toast.success("相談を解決済みにしました");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "相談状態を更新できませんでした。",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const publishFeedback = async (feedbackId: string) => {
    setSubmitting(true);
    try {
      await publishMonthlyFeedback(feedbackId);
      await loadData();
      toast.success("フィードバックを公開しました");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "フィードバックを公開できませんでした。",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openThreads = threads.filter(
    (thread) => !["resolved", "closed"].includes(thread.status),
  );
  const pendingFeedback = feedback.filter((item) => item.status === "draft");

  return (
    <div className="mx-auto max-w-7xl space-y-5 text-slate-100">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Care communication
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white">
            サポート・メッセージ管理
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            一斉お知らせ、ユーザー起点の習慣相談、月次フィードバックを分けて管理します。
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 text-sm font-semibold text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <RefreshCw
            className={`size-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`}
          />
          更新
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">対応待ちの相談</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {openThreads.filter((thread) => thread.status === "waiting_staff").length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">公開前レビュー</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {pendingFeedback.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">今月の回答</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {summary[0]?.response_count ?? 0}
            <span className="ml-1 text-sm font-normal text-slate-500">
              / {summary[0]?.assigned_count ?? 0}
            </span>
          </p>
        </div>
      </div>

      <div
        className="grid grid-cols-3 gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1"
        role="tablist"
        aria-label="メッセージ管理"
      >
        {(
          [
            ["announcements", "お知らせ", Bell],
            ["support", "相談対応", HeartHandshake],
            ["reviews", "月次レビュー", ClipboardCheck],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key)}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-xs font-bold transition-colors sm:text-sm ${
              activeTab === key
                ? "bg-emerald-500/15 text-emerald-300"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {loadError && (
        <div role="alert" className="rounded-xl border border-amber-700/50 bg-amber-950/40 p-4 text-sm text-amber-200">
          {loadError}
        </div>
      )}

      {activeTab === "announcements" && (
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Bell className="size-5 text-emerald-400" />
              <div>
                <h2 className="font-bold text-white">一斉お知らせ</h2>
                <p className="text-xs text-slate-400">
                  全ユーザーへ送る、返信を受け付けない通知です。
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-slate-300">件名</span>
                <input
                  value={announcementTitle}
                  onChange={(event) => {
                    setAnnouncementTitle(event.target.value);
                    setAnnouncementGuardMessage(null);
                  }}
                  maxLength={120}
                  className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-slate-300">本文</span>
                <textarea
                  value={announcementBody}
                  onChange={(event) => {
                    setAnnouncementBody(event.target.value);
                    setAnnouncementGuardMessage(null);
                  }}
                  maxLength={3000}
                  rows={9}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm leading-relaxed text-white focus:border-emerald-500 focus:outline-none"
                />
              </label>
              {announcementGuardMessage && (
                <div
                  role="alert"
                  className="rounded-lg border border-rose-700/60 bg-rose-950/40 p-3 text-xs leading-relaxed text-rose-200"
                >
                  {announcementGuardMessage}
                  <span className="mt-1 block">
                    銘柄・方向・タイミング・数量の推奨を外し、記録・ルール・学習の支援に書き換えてください。
                  </span>
                </div>
              )}
              <button
                type="button"
                disabled={
                  !announcementTitle.trim() ||
                  !announcementBody.trim() ||
                  submitting
                }
                onClick={() => void sendAnnouncement()}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <Send className="size-4" />
                )}
                お知らせを公開する
              </button>
            </div>
          </div>
          <aside className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <ShieldCheck className="size-5 text-emerald-400" />
            <h2 className="mt-3 text-sm font-bold text-white">送信ルール</h2>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-400">
              <li>・お知らせは一方向で、返信欄を表示しません。</li>
              <li>・個別の銘柄、価格、売買時点を推奨しません。</li>
              <li>・相談が必要な場合は習慣サポートへ案内します。</li>
              <li>・Push本文はDBの公開済み内容から生成します。</li>
            </ul>
          </aside>
        </section>
      )}

      {activeTab === "support" && (
        <section className="grid min-h-[560px] gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 p-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                <Users className="size-4 text-emerald-400" />
                ユーザー起点の相談
              </h2>
            </div>
            <div className="max-h-[620px] overflow-y-auto">
              {threads.length === 0 ? (
                <p className="p-5 text-sm text-slate-500">
                  相談はまだありません。
                </p>
              ) : (
                threads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`w-full border-b border-slate-800 p-4 text-left transition-colors last:border-b-0 ${
                      selectedThreadId === thread.id
                        ? "bg-emerald-500/10"
                        : "hover:bg-slate-800/70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-bold ${
                          thread.status === "waiting_staff"
                            ? "text-amber-300"
                            : "text-emerald-300"
                        }`}
                      >
                        {supportStatusLabels[thread.status]}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {formatDateTime(thread.last_message_at)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm font-bold text-slate-100">
                      {thread.subject}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {profileName(profileMap, thread.member_user_id)} ·{" "}
                      {supportCategoryLabels[thread.category]}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="flex min-h-[560px] flex-col rounded-xl border border-slate-800 bg-slate-900">
            {selectedThread ? (
              <>
                <div className="border-b border-slate-800 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold text-emerald-300">
                        {profileName(profileMap, selectedThread.member_user_id)}
                      </p>
                      <h2 className="mt-1 font-bold text-white">
                        {selectedThread.subject}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {supportCategoryLabels[selectedThread.category]} ·{" "}
                        {supportStatusLabels[selectedThread.status]}
                      </p>
                    </div>
                    {!["resolved", "closed"].includes(selectedThread.status) && (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => void resolveThread()}
                        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 text-xs font-bold text-slate-300 hover:bg-slate-800"
                      >
                        <CheckCircle2 className="size-4" />
                        解決済みにする
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {threadMessages.map((message) => {
                    const isStaff = message.sender_kind === "staff";
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isStaff ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[82%] rounded-xl px-3 py-2 ${
                            isStaff
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-800 text-slate-100"
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {message.body}
                          </p>
                          <p
                            className={`mt-1 text-[10px] ${
                              isStaff ? "text-emerald-100" : "text-slate-500"
                            }`}
                          >
                            {formatDateTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!["resolved", "closed"].includes(selectedThread.status) && (
                  <div className="border-t border-slate-800 p-4">
                    <div className="mb-3 flex gap-2 rounded-lg border border-amber-800/40 bg-amber-950/30 p-3">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-300" />
                      <p className="text-xs leading-relaxed text-amber-200">
                        個別の売買判断には回答せず、記録・ルール・学習の続け方へ戻してください。
                      </p>
                    </div>
                    <textarea
                      value={replyBody}
                      onChange={(event) => {
                        setReplyBody(event.target.value);
                        setReplyGuardMessage(null);
                      }}
                      maxLength={2000}
                      rows={4}
                      placeholder="行動を続けるための返信を入力"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                    {replyGuardMessage && (
                      <div
                        role="alert"
                        className="mt-2 rounded-lg border border-rose-700/60 bg-rose-950/40 p-3 text-xs leading-relaxed text-rose-200"
                      >
                        {replyGuardMessage}
                        <span className="mt-1 block">
                          記録の振り返り、本人のルール、休止や学習の選択肢に言い換えてください。
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={!replyBody.trim() || submitting}
                      onClick={() => void sendReply()}
                      className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      <Send className="size-4" />
                      返信する
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
                <MessageCircle className="size-8 text-slate-700" />
                <p className="text-sm text-slate-500">
                  左の一覧から相談を選択してください。
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === "reviews" && (
        <section className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="text-sm font-bold text-white">月次集計</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {summary.slice(0, 3).map((item) => (
                <div
                  key={`${item.organization_id}-${item.period_start}`}
                  className="rounded-lg bg-slate-950 p-3"
                >
                  <p className="text-xs text-slate-500">{item.period_start}</p>
                  <p className="mt-1 text-sm font-bold text-white">
                    回答 {item.response_count} / {item.assigned_count}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    平均：
                    {item.average_answer === null
                      ? "回答5人未満のため非表示"
                      : item.average_answer}
                  </p>
                  <p className="mt-1 text-xs text-amber-300">
                    フォロー候補 {item.followup_count}件
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 p-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                <ClipboardCheck className="size-4 text-emerald-400" />
                個別フィードバック
              </h2>
            </div>
            {feedback.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">
                フィードバックはまだありません。
              </p>
            ) : (
              <div className="divide-y divide-slate-800">
                {feedback.map((item) => (
                  <article key={item.id} className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                              item.status === "draft"
                                ? "bg-amber-500/10 text-amber-300"
                                : "bg-emerald-500/10 text-emerald-300"
                            }`}
                          >
                            {item.status === "draft" ? "公開前" : "公開済み"}
                          </span>
                          <span className="text-xs font-bold text-slate-300">
                            {feedbackSignalLabels[item.signal]}
                          </span>
                          <span className="text-xs text-slate-500">
                            {profileName(profileMap, item.user_id)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-slate-200">
                          {item.summary}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-slate-400">
                          {item.interpretation}
                        </p>
                        <div className="mt-2 rounded-lg bg-slate-950 p-3 text-xs text-slate-300">
                          次に試すこと：{item.next_action}
                        </div>
                      </div>
                      {item.status === "draft" && (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => void publishFeedback(item.id)}
                          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          <CheckCircle2 className="size-4" />
                          確認して公開
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
