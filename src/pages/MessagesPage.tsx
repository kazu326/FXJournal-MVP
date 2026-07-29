import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  HeartHandshake,
  History,
  Info,
  Loader2,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { haptics } from "../lib/haptics";
import { supabase } from "../lib/supabase";
import {
  ensureCurrentMonthCheckin,
  loadAnnouncementsAndLegacyMessages,
  loadCheckinQuestions,
  loadEvidenceCard,
  loadLatestSupportThread,
  loadMonthlyFeedback,
  loadSupportMessages,
  openSupportThread,
  postSupportMessage,
  setSupportThreadStatus,
  submitMonthlyCheckin,
} from "../features/messages/api";
import {
  feedbackSignalLabels,
  supportCategoryLabels,
  supportStatusLabels,
  type Announcement,
  type CheckinAssignment,
  type CheckinQuestion,
  type EvidenceCard,
  type LegacyMessage,
  type MonthlyFeedback,
  type SupportCategory,
  type SupportMessage,
  type SupportThread,
} from "../features/messages/types";

type MessagesPageProps = {
  userId: string;
};

const evidenceKindLabels: Record<EvidenceCard["evidence_kind"], string> = {
  meta_analysis: "メタ分析",
  experiment: "実験研究",
  observational: "観察研究",
  app_data: "アプリ内データ",
  hypothesis: "仮説",
};

const ACTIVE_SUPPORT_STATUSES = new Set([
  "open",
  "waiting_staff",
  "waiting_member",
]);

function formatMonth(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
  }).format(date);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function MessagesPage({ userId }: MessagesPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedSupportThreadId = searchParams.get("support");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<CheckinAssignment | null>(null);
  const [questions, setQuestions] = useState<CheckinQuestion[]>([]);
  const [feedback, setFeedback] = useState<MonthlyFeedback | null>(null);
  const [evidence, setEvidence] = useState<EvidenceCard | null>(null);
  const [supportThread, setSupportThread] = useState<SupportThread | null>(null);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [legacyMessages, setLegacyMessages] = useState<LegacyMessage[]>([]);

  const [checkinOpen, setCheckinOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [supportRequested, setSupportRequested] = useState(false);
  const [submittingCheckin, setSubmittingCheckin] = useState(false);

  const [supportCategory, setSupportCategory] =
    useState<SupportCategory>("record_habit");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportBody, setSupportBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [submittingSupport, setSubmittingSupport] = useState(false);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const currentAssignment = await ensureCurrentMonthCheckin();
      const [currentQuestions, messageData, latestSupport] = await Promise.all([
        loadCheckinQuestions(currentAssignment.definition_id),
        loadAnnouncementsAndLegacyMessages(userId),
        loadLatestSupportThread(userId),
      ]);

      let currentFeedback: MonthlyFeedback | null = null;
      let currentEvidence: EvidenceCard | null = null;
      if (currentAssignment.status === "completed") {
        currentFeedback = await loadMonthlyFeedback(currentAssignment.id);
        currentEvidence = await loadEvidenceCard(
          currentFeedback?.evidence_card_id ?? null,
        );
      }

      let currentSupportMessages: SupportMessage[] = [];
      if (latestSupport) {
        currentSupportMessages = await loadSupportMessages(latestSupport.id);
      }

      setAssignment(currentAssignment);
      setQuestions(currentQuestions);
      setFeedback(currentFeedback);
      setEvidence(currentEvidence);
      setSupportThread(latestSupport);
      setSupportMessages(currentSupportMessages);
      setAnnouncements(messageData.announcements);
      setLegacyMessages(messageData.legacyMessages);
      if (
        requestedSupportThreadId &&
        latestSupport?.id === requestedSupportThreadId
      ) {
        setSupportOpen(true);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "メッセージページを読み込めませんでした。";
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [requestedSupportThreadId, userId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadPage(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadPage]);

  useEffect(() => {
    const channel = supabase
      .channel(`message-care-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_messages" },
        () => void loadPage(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "monthly_feedback" },
        () => void loadPage(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcements" },
        () => void loadPage(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadPage, userId]);

  const answeredCount = useMemo(
    () =>
      questions.filter((question) =>
        Object.prototype.hasOwnProperty.call(answers, question.question_key),
      ).length,
    [answers, questions],
  );

  const isSupportActive =
    supportThread !== null && ACTIVE_SUPPORT_STATUSES.has(supportThread.status);

  const submitCheckin = async () => {
    if (!assignment || answeredCount !== questions.length) return;
    setSubmittingCheckin(true);
    try {
      const result = await submitMonthlyCheckin(
        assignment.id,
        answers,
        supportRequested,
      );
      haptics.success();
      setCheckinOpen(false);
      setAnswers({});
      setSupportRequested(false);
      toast.success(
        result.feedback_status === "published"
          ? "チェックインを保存しました"
          : "チェックインを受け付けました。担当者が確認します",
      );
      await loadPage();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "チェックインを保存できませんでした。",
      );
    } finally {
      setSubmittingCheckin(false);
    }
  };

  const createSupport = async () => {
    if (!supportSubject.trim() || !supportBody.trim()) return;
    setSubmittingSupport(true);
    try {
      await openSupportThread(
        supportCategory,
        supportSubject.trim(),
        supportBody.trim(),
      );
      haptics.success();
      setSupportSubject("");
      setSupportBody("");
      toast.success("相談を受け付けました");
      await loadPage();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "相談を開始できませんでした。",
      );
    } finally {
      setSubmittingSupport(false);
    }
  };

  const sendSupportReply = async () => {
    if (!supportThread || !replyBody.trim()) return;
    setSubmittingSupport(true);
    try {
      await postSupportMessage(supportThread.id, replyBody.trim());
      haptics.light();
      setReplyBody("");
      await loadPage();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "メッセージを送信できませんでした。",
      );
    } finally {
      setSubmittingSupport(false);
    }
  };

  const resolveSupport = async () => {
    if (!supportThread) return;
    setSubmittingSupport(true);
    try {
      await setSupportThreadStatus(supportThread.id, "resolved");
      toast.success("相談を解決済みにしました");
      setSupportOpen(false);
      await loadPage();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "相談状態を更新できませんでした。",
      );
    } finally {
      setSubmittingSupport(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-dvh px-4 py-6">
        <div
          className="mx-auto flex min-h-72 max-w-md items-center justify-center"
          aria-label="メッセージページを読み込み中"
        >
          <Loader2 className="size-7 animate-spin text-blue-500 motion-reduce:animate-none" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh px-4 py-5">
      <div className="mx-auto max-w-md space-y-3 pb-24">
        <header className="px-1">
          <p className="mb-1 text-xs font-semibold tracking-wide text-blue-600">
            記録と学びを支える場所
          </p>
          <h1 className="flex items-center gap-2 text-xl font-bold text-zinc-900">
            <HeartHandshake className="size-5 text-blue-600" />
            サポート・メッセージ
          </h1>
        </header>

        {loadError && (
          <div
            role="alert"
            className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
          >
            <p className="text-sm font-semibold text-amber-950">
              一部の情報を読み込めませんでした
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-800">
              {loadError}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 h-9 px-3"
              onClick={() => void loadPage()}
            >
              再読み込み
            </Button>
          </div>
        )}

        {assignment && (
          <Card
            className={`overflow-hidden border-0 ${
              assignment.status === "due"
                ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200"
                : "bg-white"
            }`}
            data-testid="monthly-checkin-card"
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p
                    className={`text-xs font-semibold ${
                      assignment.status === "due"
                        ? "text-blue-100"
                        : "text-blue-600"
                    }`}
                  >
                    {formatMonth(assignment.period_start)}
                  </p>
                  <h2 className="mt-1 text-base font-bold">
                    {assignment.status === "due"
                      ? "今月の行動を振り返りましょう"
                      : "今月のチェックインは完了です"}
                  </h2>
                  <p
                    className={`mt-1 text-xs leading-relaxed ${
                      assignment.status === "due"
                        ? "text-blue-50"
                        : "text-zinc-500"
                    }`}
                  >
                    {assignment.status === "due"
                      ? "5問・約1分。利益ではなく、記録と判断の習慣を確認します。"
                      : "回答は合計点で評価せず、設問ごとの変化を確認します。"}
                  </p>
                </div>
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                    assignment.status === "due"
                      ? "bg-white/15"
                      : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  {assignment.status === "due" ? (
                    <ClipboardCheck className="size-5" />
                  ) : (
                    <CheckCircle2 className="size-5" />
                  )}
                </div>
              </div>

              {assignment.status === "due" && (
                <button
                  type="button"
                  onClick={() => {
                    haptics.light();
                    setCheckinOpen(true);
                  }}
                  className="mt-3 flex w-full items-center justify-between rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-blue-700 shadow-sm transition-transform active:scale-[0.98] motion-reduce:transition-none"
                >
                  チェックインを始める
                  <ArrowRight className="size-4" />
                </button>
              )}
            </CardContent>
          </Card>
        )}

        {assignment?.status === "completed" && feedback && (
          <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-emerald-600" />
                  <p className="text-xs font-bold text-emerald-700">
                    {feedbackSignalLabels[feedback.signal]}
                  </p>
                </div>
                <span className="text-[11px] text-zinc-400">
                  {formatMonth(feedback.period_start)}
                </span>
              </div>
              <h2 className="mt-2 text-base font-bold text-zinc-900">
                今月のフィードバック
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-700">
                {feedback.summary}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                {feedback.interpretation}
              </p>
              <div className="mt-3 rounded-xl border border-emerald-100 bg-white/80 p-3">
                <p className="text-[11px] font-bold text-emerald-700">
                  次に試すこと
                </p>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-zinc-800">
                  {feedback.next_action}
                </p>
              </div>
              {evidence && (
                <button
                  type="button"
                  onClick={() => setEvidenceOpen(true)}
                  className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg px-1 text-sm font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <BookOpenCheck className="size-4" />
                  この助言の根拠と限界
                  <ChevronRight className="size-4" />
                </button>
              )}
            </CardContent>
          </Card>
        )}

        {assignment?.status === "completed" && !feedback && (
          <Card className="border-amber-100 bg-amber-50/70">
            <CardContent className="flex items-start gap-3 p-4">
              <Loader2 className="mt-0.5 size-4 shrink-0 text-amber-600 motion-reduce:animate-none" />
              <div>
                <h2 className="text-sm font-bold text-amber-950">
                  担当者が内容を確認しています
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-amber-800">
                  回答を受け付けました。診断や売買判断ではなく、記録と習慣を続ける方法としてお返しします。
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-blue-100 bg-white">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <MessageCircle className="size-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-900">
                    習慣サポート
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    記録・ルール・感情・見送り・学習について、無償で相談できます。
                  </p>
                </div>
              </div>
            </div>

            {supportThread && isSupportActive && (
              <div className="mt-3 rounded-xl bg-blue-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-blue-700">
                    {supportStatusLabels[supportThread.status]}
                  </span>
                  <span className="text-[11px] text-blue-500">
                    {formatDateTime(supportThread.last_message_at)}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-zinc-800">
                  {supportThread.subject}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                haptics.light();
                setSupportOpen(true);
              }}
              className="mt-3 flex min-h-11 w-full items-center justify-between rounded-xl border border-blue-200 bg-blue-50/60 px-4 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {isSupportActive ? "相談を開く" : "相談を始める"}
              <ChevronRight className="size-4" />
            </button>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Bell className="size-4 text-zinc-500" />
              <h2 className="text-sm font-bold text-zinc-900">お知らせ</h2>
              <span className="ml-auto text-[11px] text-zinc-400">返信不可</span>
            </div>
            {announcements.length === 0 ? (
              <p className="text-xs text-zinc-500">新しいお知らせはありません。</p>
            ) : (
              <div className="divide-y divide-zinc-100">
                {announcements.slice(0, 3).map((announcement) => (
                  <button
                    key={announcement.id}
                    type="button"
                    onClick={() =>
                      navigate(`/messages/announcements/${announcement.id}`)
                    }
                    className="flex w-full items-center gap-3 py-3 text-left first:pt-0 last:pb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-800">
                        {announcement.title}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
                        {announcement.body}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-zinc-300" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {legacyMessages.length > 0 && (
          <Card className="border-zinc-100 bg-white/70 shadow-sm">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <History className="size-4 text-zinc-400" />
                <h2 className="text-sm font-bold text-zinc-700">
                  過去の個別メッセージ
                </h2>
                <span className="ml-auto text-[11px] text-zinc-400">
                  読み取り専用
                </span>
              </div>
              <div className="divide-y divide-zinc-100">
                {legacyMessages.map((message) => (
                  <button
                    key={message.id}
                    type="button"
                    onClick={() => navigate(`/messages/dm/${message.id}`)}
                    className="flex w-full items-center gap-2 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <p className="line-clamp-1 flex-1 text-xs text-zinc-600">
                      {message.body}
                    </p>
                    <ChevronRight className="size-3.5 text-zinc-300" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={checkinOpen} onOpenChange={setCheckinOpen}>
        <DialogContent className="max-h-[92dvh] max-w-[calc(100%-2rem)] overflow-y-auto rounded-2xl bg-white p-5 text-zinc-900 [&>button:last-child]:flex [&>button:last-child]:size-9 [&>button:last-child]:items-center [&>button:last-child]:justify-center [&>button:last-child]:border [&>button:last-child]:border-zinc-200 [&>button:last-child]:bg-white [&>button:last-child]:text-zinc-700 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>今月の行動チェックイン</DialogTitle>
            <DialogDescription>
              利益や勝敗ではなく、記録と判断の習慣を振り返ります。
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-900">
            回答と記録データは個別フィードバックに利用され、所属先の権限を持つ担当者が確認できます。投資判断や医学的診断には使用しません。
          </div>

          <div className="space-y-5">
            {questions.map((question, questionIndex) => {
              const hasAnswer = Object.prototype.hasOwnProperty.call(
                answers,
                question.question_key,
              );
              const selected = answers[question.question_key];
              return (
                <fieldset
                  key={question.id}
                  className="space-y-2 border-b border-zinc-100 pb-4 last:border-b-0"
                >
                  <legend className="text-sm font-bold leading-relaxed text-zinc-900">
                    <span className="mr-2 text-blue-600">
                      {questionIndex + 1}.
                    </span>
                    {question.prompt}
                  </legend>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        aria-label={`${question.prompt} ${value}`}
                        aria-pressed={hasAnswer && selected === value}
                        onClick={() => {
                          haptics.light();
                          setAnswers((current) => ({
                            ...current,
                            [question.question_key]: value,
                          }));
                        }}
                        className={`min-h-11 rounded-xl border text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                          hasAnswer && selected === value
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-zinc-200 bg-white text-zinc-600"
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between gap-3 text-[10px] leading-tight text-zinc-500">
                    <span>{question.low_label}</span>
                    <span className="text-right">{question.high_label}</span>
                  </div>
                  {question.allow_not_applicable && (
                    <button
                      type="button"
                      aria-pressed={hasAnswer && selected === null}
                      onClick={() =>
                        setAnswers((current) => ({
                          ...current,
                          [question.question_key]: null,
                        }))
                      }
                      className={`min-h-9 rounded-lg border px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        hasAnswer && selected === null
                          ? "border-zinc-600 bg-zinc-700 text-white"
                          : "border-zinc-200 text-zinc-600"
                      }`}
                    >
                      今月は該当なし
                    </button>
                  )}
                </fieldset>
              );
            })}
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <input
              type="checkbox"
              checked={supportRequested}
              onChange={(event) => setSupportRequested(event.target.checked)}
              className="mt-0.5 size-4 accent-blue-600"
            />
            <span>
              <span className="block text-sm font-bold text-zinc-800">
                担当者への相談を希望する
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                売買判断ではなく、記録・ルール・学習の続け方を相談できます。
              </span>
            </span>
          </label>

          <div className="sticky bottom-0 -mx-1 bg-white/95 pt-2 backdrop-blur">
            <Button
              type="button"
              className="min-h-12 w-full"
              disabled={
                answeredCount !== questions.length || submittingCheckin
              }
              onClick={() => void submitCheckin()}
            >
              {submittingCheckin ? (
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <Check className="size-4" />
              )}
              {answeredCount === questions.length
                ? "回答を保存する"
                : `${answeredCount} / ${questions.length} 問回答済み`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={evidenceOpen} onOpenChange={setEvidenceOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] rounded-2xl bg-white text-zinc-900 [&>button:last-child]:flex [&>button:last-child]:size-9 [&>button:last-child]:items-center [&>button:last-child]:justify-center [&>button:last-child]:border [&>button:last-child]:border-zinc-200 [&>button:last-child]:bg-white [&>button:last-child]:text-zinc-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>根拠と限界</DialogTitle>
            <DialogDescription>
              助言の背景を確認できます。研究結果を個人への診断としては扱いません。
            </DialogDescription>
          </DialogHeader>
          {evidence && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                  {evidenceKindLabels[evidence.evidence_kind]}
                </span>
                <span className="text-xs text-zinc-500">
                  {evidence.source_year ?? "年不明"}
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  {evidence.title}
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  {evidence.source_name}
                </p>
              </div>
              <p className="text-sm leading-relaxed text-zinc-700">
                {evidence.summary}
              </p>
              <div className="rounded-xl bg-zinc-50 p-3">
                <p className="text-xs font-bold text-zinc-700">対象範囲</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                  {evidence.scope_note}
                </p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                <p className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Info className="size-3.5" />
                  この根拠の限界
                </p>
                <p className="mt-1 text-xs leading-relaxed text-amber-800">
                  {evidence.limitation_note}
                </p>
              </div>
              <a
                href={evidence.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-blue-700"
              >
                出典を確認する
                <ExternalLink className="size-4" />
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
        <DialogContent className="max-h-[92dvh] max-w-[calc(100%-2rem)] overflow-y-auto rounded-2xl bg-white p-5 text-zinc-900 [&>button:last-child]:flex [&>button:last-child]:size-9 [&>button:last-child]:items-center [&>button:last-child]:justify-center [&>button:last-child]:border [&>button:last-child]:border-zinc-200 [&>button:last-child]:bg-white [&>button:last-child]:text-zinc-700 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isSupportActive ? "習慣サポート" : "相談を始める"}
            </DialogTitle>
            <DialogDescription>
              記録や学習を続ける方法を一緒に整理します。
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" />
            <p className="text-xs leading-relaxed text-emerald-900">
              特定の通貨・価格・売買時点・ロットなどの個別判断には回答できません。判断に至った記録や、ルールを守る工夫は一緒に整理できます。
            </p>
          </div>

          {isSupportActive && supportThread ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-zinc-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-blue-700">
                    {supportStatusLabels[supportThread.status]}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    {supportCategoryLabels[supportThread.category]}
                  </span>
                </div>
                <h3 className="mt-1 text-sm font-bold text-zinc-900">
                  {supportThread.subject}
                </h3>
              </div>

              <div
                className="max-h-72 space-y-3 overflow-y-auto pr-1"
                aria-live="polite"
              >
                {supportMessages.map((message) => {
                  const isMember = message.sender_kind === "member";
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isMember ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[86%] rounded-2xl px-3 py-2 ${
                          isMember
                            ? "rounded-br-md bg-blue-600 text-white"
                            : "rounded-bl-md bg-zinc-100 text-zinc-800"
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {message.body}
                        </p>
                        <p
                          className={`mt-1 text-[10px] ${
                            isMember ? "text-blue-100" : "text-zinc-400"
                          }`}
                        >
                          {formatDateTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <Textarea
                  value={replyBody}
                  onChange={(event) => setReplyBody(event.target.value)}
                  maxLength={2000}
                  placeholder="続け方について相談したいことを入力"
                  aria-label="相談メッセージ"
                />
                <Button
                  type="button"
                  className="min-h-11 w-full"
                  disabled={!replyBody.trim() || submittingSupport}
                  onClick={() => void sendSupportReply()}
                >
                  <Send className="size-4" />
                  送信する
                </Button>
                <button
                  type="button"
                  disabled={submittingSupport}
                  onClick={() => void resolveSupport()}
                  className="min-h-10 w-full rounded-xl text-xs font-semibold text-zinc-500 hover:bg-zinc-50"
                >
                  この相談を解決済みにする
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-zinc-700">
                  相談する内容
                </span>
                <select
                  value={supportCategory}
                  onChange={(event) =>
                    setSupportCategory(event.target.value as SupportCategory)
                  }
                  className="min-h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {Object.entries(supportCategoryLabels).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-zinc-700">件名</span>
                <input
                  value={supportSubject}
                  onChange={(event) => setSupportSubject(event.target.value)}
                  maxLength={120}
                  placeholder="例：記録を忘れてしまう"
                  className="min-h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm focus:border-blue-500 focus:outline-none"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-zinc-700">
                  相談したいこと
                </span>
                <Textarea
                  value={supportBody}
                  onChange={(event) => setSupportBody(event.target.value)}
                  maxLength={2000}
                  placeholder="困った場面と、すでに試したことがあれば教えてください。"
                />
              </label>
              <Button
                type="button"
                className="min-h-12 w-full"
                disabled={
                  !supportSubject.trim() ||
                  !supportBody.trim() ||
                  submittingSupport
                }
                onClick={() => void createSupport()}
              >
                {submittingSupport ? (
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <Send className="size-4" />
                )}
                相談を送る
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
