import { useEffect, useMemo, useState, type CSSProperties } from "react";
import "./App.css";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { labels } from "./ui/labels";
import { copy } from "./ui/copy.ts";

type Mode = "home" | "pre" | "post" | "history" | "complete";

type GateState = {
  gate_trade_count_ok: boolean;
  gate_rr_ok: boolean;
  gate_risk_ok: boolean;
  gate_rule_ok: boolean;
};

type LogType = "valid" | "invalid" | "skip";
type SuccessProb = "high" | "mid" | "low";
type ExpectedValue = "plus" | "minus" | "unknown";

type TradeLogLite = {
  id: string;
  occurred_at: string;
  log_type: LogType;
  gate_all_ok: boolean;
  success_prob: SuccessProb | null;
  expected_value: ExpectedValue | null;
  post_gate_kept: boolean | null;
  post_within_hypothesis: boolean | null;
  unexpected_reason: string | null;
  voided_at?: string | null;
  completed_at?: string | null;
};

type HistoryLog = {
  id: string;
  occurred_at: string;
  log_type: LogType;
  gate_trade_count_ok: boolean | null;
  gate_rr_ok: boolean | null;
  gate_risk_ok: boolean | null;
  gate_rule_ok: boolean | null;
  success_prob: SuccessProb | null;
  expected_value: ExpectedValue | null;
  post_gate_kept: boolean | null;
  post_within_hypothesis: boolean | null;
  unexpected_reason: string | null;
  voided_at: string | null;
  void_reason: string | null;
  completed_at: string | null;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

type ReviewQueueRow = {
  log_id: string;
  occurred_at: string;
  log_type: LogType;
  user_id: string | null;
  member_id: string | null;
  display_name: string | null;
  email: string | null;
  gate_trade_count_ok: boolean | null;
  gate_rr_ok: boolean | null;
  gate_risk_ok: boolean | null;
  gate_rule_ok: boolean | null;
  success_prob: SuccessProb | null;
  expected_value: ExpectedValue | null;
  post_gate_kept: boolean | null;
  post_within_hypothesis: boolean | null;
  unexpected_reason: string | null;
  teacher_review: string | null;
  teacher_note: string | null;
  teacher_reviewed_at: string | null;
  voided_at: string | null;
};

type RiskQueueRow = {
  user_id: string | null;
  member_id: string | null;
  display_name: string | null;
  email: string | null;
  invalid_7: number;
  skip_7: number;
  valid_7: number;
  weekly_limit: number | null;
  alert_invalid: boolean;
  alert_skip0: boolean;
  alert_over_weekly: boolean;
  last_log_id: string | null;
  last_log_at: string | null;
};

type UnfinishedQueueRow = {
  log_id: string;
  occurred_at: string;
  user_id: string | null;
  member_id: string | null;
  display_name: string | null;
  email: string | null;
  hours_since: number;
  is_over_24h: boolean;
  followup_sent_at: string | null;
};

type UnlockCandidateRow = {
  user_id: string;
  member_id: string | null;
  display_name: string | null;
  email: string | null;
  weekly_limit: number | null;
  suggested_weekly_limit: number;
  valid_count_14: number;
  invalid_count_14: number;
  risk_ok_rate_14: number;
  rule_ok_rate_14: number;
  last_log_at: string | null;
};

type AdminLogRow = {
  id: string;
  occurred_at: string;
  log_type: LogType;
  user_id: string | null;
  member_id: string | null;
  gate_trade_count_ok: boolean | null;
  gate_rr_ok: boolean | null;
  gate_risk_ok: boolean | null;
  gate_rule_ok: boolean | null;
  success_prob: SuccessProb | null;
  expected_value: ExpectedValue | null;
  post_gate_kept: boolean | null;
  post_within_hypothesis: boolean | null;
  unexpected_reason: string | null;
  teacher_review: string | null;
  teacher_note: string | null;
  teacher_reviewed_at: string | null;
  voided_at: string | null;
  display_name: string | null;
  email: string | null;
};

type DmThread = {
  id: string;
  member_user_id: string;
  teacher_user_id: string;
  created_at: string;
};

type DmMessage = {
  id: string;
  thread_id: string;
  sender_user_id: string | null;
  body: string;
  created_at: string;
};

type MemberSettings = {
  member_user_id: string;
  weekly_limit: number;
  max_risk_percent: number;
  unlocked: boolean;
  note: string | null;
};


const initialGate: GateState = {
  gate_trade_count_ok: true,
  gate_rr_ok: true,
  gate_risk_ok: true,
  gate_rule_ok: true,
};

function labelProb(v: SuccessProb | null) {
  if (!v) return "未入力";
  return v === "high" ? "高（自信あり）" : v === "mid" ? "中（五分）" : "低（微妙）";
}
function labelEV(v: ExpectedValue | null) {
  if (!v) return "未入力";
  return v === "plus" ? "＋（期待値あり）" : v === "minus" ? "－（期待値なし）" : "不明";
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function nextMondayLabel() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun,1=Mon
  const daysUntil = (8 - day) % 7 || 7;
  d.setDate(d.getDate() + daysUntil);
  return d.toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit" });
}

function extractCompleteLogId(body: string) {
  const match = body.match(/\/complete\/([a-zA-Z0-9-]+)/);
  return match ? match[1] : null;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState<Mode>("home");
  const [showMenu, setShowMenu] = useState(false);
  const isAdminRoute =
    window.location.pathname.startsWith("/admin") || window.location.pathname.startsWith("/staff");
  const isAdminLogsRoute =
    window.location.pathname.startsWith("/admin/logs") ||
    window.location.pathname.startsWith("/staff/logs");
  const completeLogId =
    !isAdminRoute && window.location.pathname.startsWith("/complete/")
      ? decodeURIComponent(window.location.pathname.replace("/complete/", ""))
      : null;
  const [testMode, setTestMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("fxj_test_mode") === "1";
  });
  const isTestMode = testMode;

  // login
  const [email, setEmail] = useState("");

  // pending（取引前は書いたけど、取引後チェックが未完のログ）
  const [pending, setPending] = useState<TradeLogLite | null>(null);
  const [activeLog, setActiveLog] = useState<TradeLogLite | null>(null);
  const [currentLogId, setCurrentLogId] = useState<string | null>(null);
  const [completeLog, setCompleteLog] = useState<HistoryLog | null>(null);
  const [completeSuccessProb, setCompleteSuccessProb] = useState<SuccessProb | null>(null);
  const [completeExpectedValue, setCompleteExpectedValue] = useState<ExpectedValue | null>(null);
  const [completePostGateKept, setCompletePostGateKept] = useState<boolean | null>(null);
  const [completePostWithinHypo, setCompletePostWithinHypo] = useState<boolean | null>(null);
  const [completeUnexpectedReason, setCompleteUnexpectedReason] = useState("");

  const [role, setRole] = useState<"member" | "teacher" | "admin">("member");
  const isTeacher = role === "teacher" || role === "admin";
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [profileNameMap, setProfileNameMap] = useState<Record<string, string>>({});

  // pre (取引前)
  const [gate, setGate] = useState<GateState>(initialGate);
  const [successProb, setSuccessProb] = useState<SuccessProb>("mid");
  const [expectedValue, setExpectedValue] = useState<ExpectedValue>("unknown");
  const [accountBalance, setAccountBalance] = useState("");
  const [stopLossAmount, setStopLossAmount] = useState("");
  const [takeProfitAmount, setTakeProfitAmount] = useState("");
  const [gateHelp, setGateHelp] = useState({ rr: false, risk: false, rule: false });


  // post (取引後)
  const [postGateKept, setPostGateKept] = useState<boolean | null>(null);
  const [postWithinHypo, setPostWithinHypo] = useState<boolean | null>(null);
  const [unexpectedReason, setUnexpectedReason] = useState("");

  // progress summary
  const [weeklyAttempts, setWeeklyAttempts] = useState(0);
  const [memberSettings, setMemberSettings] = useState<MemberSettings | null>(null);
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
  const [historyTarget, setHistoryTarget] = useState<HistoryLog | null>(null);
  const [voidReason, setVoidReason] = useState("");

  // announcements + DM (member)
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [memberThreads, setMemberThreads] = useState<DmThread[]>([]);
  const [memberMessages, setMemberMessages] = useState<DmMessage[]>([]);
  const [memberDmInput, setMemberDmInput] = useState("");

  // admin portal
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueRow[]>([]);
  const [unfinishedQueue, setUnfinishedQueue] = useState<UnfinishedQueueRow[]>([]);
  const [unlockCandidates, setUnlockCandidates] = useState<UnlockCandidateRow[]>([]);
  const [riskQueue, setRiskQueue] = useState<RiskQueueRow[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLogRow[]>([]);
  const [adminSelectedLog, setAdminSelectedLog] = useState<AdminLogRow | ReviewQueueRow | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState("");
  const [adminWeeklyLimit, setAdminWeeklyLimit] = useState(2);
  const [adminMaxRisk, setAdminMaxRisk] = useState(2);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminSettingsNote, setAdminSettingsNote] = useState("");
  const [filterMemberQuery, setFilterMemberQuery] = useState("");
  const [filterPeriod, setFilterPeriod] = useState<"7" | "30" | "all">("7");
  const [filterLogType, setFilterLogType] = useState<"all" | LogType>("all");
  const [filterReview, setFilterReview] = useState<"all" | "ok" | "warn" | "inspect" | "none">("all");
  const [showFollowupQueue, setShowFollowupQueue] = useState(false);
  const [showReviewQueue, setShowReviewQueue] = useState(false);
  const [showRiskQueue, setShowRiskQueue] = useState(false);
  const [showUnlockQueue, setShowUnlockQueue] = useState(false);

  const gateAllOk = useMemo(
    () => {
      const balance = Number(accountBalance);
      const stopLoss = Number(stopLossAmount);
      const takeProfit = Number(takeProfitAmount);
      const rr = stopLoss > 0 && takeProfit > 0 ? takeProfit / stopLoss : null;
      const riskPct = balance > 0 && stopLoss > 0 ? (stopLoss / balance) * 100 : null;
      const rrOk = rr !== null && rr >= 3;
      const riskOk = riskPct !== null && riskPct <= 2;
      return rrOk && riskOk && gate.gate_rule_ok;
    },
    [accountBalance, stopLossAmount, takeProfitAmount, gate.gate_rule_ok]
  );
  const weeklyLocked =
    !!memberSettings &&
    !memberSettings.unlocked &&
    weeklyAttempts >= memberSettings.weekly_limit;

  // --- Auth bootstrap ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("fxj_test_mode", testMode ? "1" : "0");
  }, [testMode]);

  // --- load pending when logged in ---
  useEffect(() => {
    if (!session) return;
    void loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session || !completeLogId) return;
    void loadCompleteLog(completeLogId);
    setMode("complete");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, completeLogId]);

  useEffect(() => {
    if (!session) return;
    void loadMyRole();
    void loadWeeklyCount();
    void loadMemberSettings();
    void loadAnnouncements();
    void loadMemberDm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session || !isAdminRoute || !isTeacher) return;
    void loadReviewQueue();
    void loadUnfinishedQueue();
    void loadRiskQueue();
    try {
      void loadUnlockCandidates();
    } catch (err) {
      reportError("解放候補取得失敗", err as { message?: string; details?: string });
    }
    if (isAdminLogsRoute) void loadAdminLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, isAdminRoute, isTeacher, isAdminLogsRoute]);

  const sendMagicLink = async () => {
    setStatus("");
    const e = email.trim();
    if (!e) return setStatus("メールを入力してください。");

    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) setStatus(`送信失敗: ${error.message}`);
    else setStatus("マジックリンクを送信しました。メールのリンクを踏んでください。");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setMode("home");
    setPending(null);
    setActiveLog(null);
    setCurrentLogId(null);
    setCompleteLog(null);
    setCompleteSuccessProb(null);
    setCompleteExpectedValue(null);
    setCompletePostGateKept(null);
    setCompletePostWithinHypo(null);
    setCompleteUnexpectedReason("");
    setGate(initialGate);
    setSuccessProb("mid");
    setExpectedValue("unknown");
    setPostGateKept(null);
    setPostWithinHypo(null);
    setUnexpectedReason("");
    setWeeklyAttempts(0);
    setHistoryLogs([]);
    setHistoryTarget(null);
    setVoidReason("");
    setRole("member");
    setAnnouncements([]);
    setMemberThreads([]);
    setMemberMessages([]);
    setMemberDmInput("");
    setMemberSettings(null);
    setReviewQueue([]);
    setUnfinishedQueue([]);
    setUnlockCandidates([]);
    setRiskQueue([]);
    setAdminLogs([]);
    setAdminSelectedLog(null);
    setAdminNoteInput("");
    setAdminWeeklyLimit(2);
    setAdminMaxRisk(2);
    setAdminUnlocked(false);
    setAdminSettingsNote("");
    setFilterMemberQuery("");
    setFilterPeriod("7");
    setFilterLogType("all");
    setFilterReview("all");
    setShowRiskQueue(false);
    setShowUnlockQueue(false);
    setStatus("");
  };

  const reportError = (label: string, error: { message?: string; details?: string } | null) => {
    console.error(label, error);
    const detail = error?.details ? ` / ${error.details}` : "";
    setStatus(`${label}: ${error?.message ?? "不明なエラー"}${detail}`);
  };

  const loadPending = async () => {
    setStatus("");
    const { data, error } = await supabase
      .from("trade_logs")
      .select(
        "id, occurred_at, log_type, gate_all_ok, success_prob, expected_value, post_gate_kept, post_within_hypothesis, unexpected_reason, voided_at, completed_at"
      )
      .eq("log_type", "valid")
      // ★未完判定（簡易）
      .or("success_prob.is.null,expected_value.is.null,post_gate_kept.is.null,post_within_hypothesis.is.null")
      .is("voided_at", null)
      .is("completed_at", null)
      .order("occurred_at", { ascending: false })
      .limit(1);

    if (error) {
      reportError("未完ログ取得失敗", error);
      return;
    }
    const next = (data?.[0] as TradeLogLite) ?? null;
    setPending(next);
    setActiveLog(next);
    setCurrentLogId(next?.id ?? null);
  };

  const loadWeeklyCount = async () => {
    setStatus("");
    if (!session?.user?.id) return;
    const { data, error } = await supabase
      .from("v_weekly_counts")
      .select("attempts_week")
      .eq("user_id", session.user.id)
      .single();

    if (error) return reportError("進捗取得失敗", error);
    const attempts = data?.attempts_week ?? 0;
    setWeeklyAttempts(attempts);
  };

  const loadMemberSettings = async () => {
    if (!session?.user?.id) return;
    const { data, error } = await supabase
      .from("member_settings")
      .select("member_user_id, weekly_limit, max_risk_percent, unlocked, note")
      .eq("member_user_id", session.user.id)
      .maybeSingle();
    if (error) return reportError("設定取得失敗", error);
    if (!data) {
      const { data: created, error: createError } = await supabase
        .from("member_settings")
        .upsert(
          {
            member_user_id: session.user.id,
            weekly_limit: 2,
            max_risk_percent: 2,
            unlocked: false,
            note: null,
          },
          { onConflict: "member_user_id" }
        )
        .select("member_user_id, weekly_limit, max_risk_percent, unlocked, note")
        .single();
      if (createError) return reportError("設定初期化失敗", createError);
      setMemberSettings(created as MemberSettings);
      return;
    }
    setMemberSettings(data as MemberSettings);
  };

  const loadMyRole = async () => {
    if (!session?.user?.id) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("role, display_name")
      .eq("user_id", session.user.id)
      .single();

    if (!error && data?.role) setRole(data.role);
    const nextName = data?.display_name?.trim() || null;
    setProfileDisplayName(nextName);
    setNameInput(nextName ?? "");
    if (!isAdminRoute && !nextName) setShowNameModal(true);
  };

  const saveProfileName = async () => {
    if (!session?.user?.id) return;
    const next = nameInput.trim();
    if (!next) return setStatus("表示名を入力してください。");
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: next })
      .eq("user_id", session.user.id);
    if (error) return reportError("表示名の保存に失敗", error);
    setProfileDisplayName(next);
    setShowNameModal(false);
    setStatus("✅ 表示名を更新しました。");
  };

  const loadProfileNames = async (userIds: Array<string | null | undefined>) => {
    const ids = Array.from(new Set(userIds.filter((id): id is string => !!id)));
    if (ids.length === 0) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", ids);
    if (error) return reportError("表示名取得失敗", error);
    const next: Record<string, string> = {};
    (data ?? []).forEach((p: any) => {
      if (p.user_id && p.display_name) next[p.user_id] = p.display_name;
    });
    setProfileNameMap((prev) => ({ ...prev, ...next }));
  };
  const displayNameFor = (
    userId?: string | null,
    fallbackName?: string | null,
    memberId?: string | null,
    email?: string | null
  ) => {
    const fromProfile = userId ? profileNameMap[userId] : null;
    return fromProfile ?? fallbackName ?? memberId ?? email ?? "—";
  };

  const loadAnnouncements = async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("id, title, body, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (!error) setAnnouncements((data ?? []) as Announcement[]);
  };

  const loadMemberDm = async () => {
    if (!session?.user?.id) return;
    const { data: threads, error: threadError } = await supabase
      .from("dm_threads")
      .select("id, member_user_id, teacher_user_id, created_at")
      .eq("member_user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (threadError) return;
    const threadList = (threads ?? []) as DmThread[];
    setMemberThreads(threadList);
    if (threadList.length === 0) {
      setMemberMessages([]);
      return;
    }
    const threadIds = threadList.map((t) => t.id);
    const { data: messages } = await supabase
      .from("dm_messages")
      .select("id, thread_id, sender_user_id, body, created_at")
      .in("thread_id", threadIds)
      .order("created_at", { ascending: false })
      .limit(50);
    setMemberMessages((messages ?? []) as DmMessage[]);
  };

  const resetPre = () => {
    setGate(initialGate);
    setSuccessProb("mid");
    setExpectedValue("unknown");
    setAccountBalance("");
    setStopLossAmount("");
    setTakeProfitAmount("");
  };

  const resetPost = () => {
    setPostGateKept(null);
    setPostWithinHypo(null);
    setUnexpectedReason("");
  };

  const saveSkipQuick = async () => {
    setStatus("");
    if (!session?.user?.id) return setStatus("未ログインです。");

    const skipGate = {
      gate_trade_count_ok: false,
      gate_rr_ok: false,
      gate_risk_ok: false,
      gate_rule_ok: false,
    };

    const { error } = await supabase.from("trade_logs").insert([
      { user_id: session.user.id, log_type: "skip", ...skipGate },
    ]);

    if (error) return setStatus(`保存失敗: ${error.message}`);
    setStatus("✅ 見送りとして記録しました。");
    await loadWeeklyCount();
  };

  const loadHistory = async () => {
    setStatus("");
    if (!session?.user?.id) return;
    const { data, error } = await supabase
      .from("trade_logs")
      .select(
        "id, occurred_at, log_type, gate_trade_count_ok, gate_rr_ok, gate_risk_ok, gate_rule_ok, success_prob, expected_value, post_gate_kept, post_within_hypothesis, unexpected_reason, voided_at, void_reason, completed_at"
      )
      .eq("user_id", session.user.id)
      .order("occurred_at", { ascending: false })
      .limit(50);

    if (error) return reportError("履歴取得失敗", error);
    setHistoryLogs((data ?? []) as HistoryLog[]);
  };

  const loadCompleteLog = async (logId: string) => {
    setStatus("");
    if (!session?.user?.id) return;
    const { data, error } = await supabase
      .from("trade_logs")
      .select(
        "id, occurred_at, log_type, gate_trade_count_ok, gate_rr_ok, gate_risk_ok, gate_rule_ok, success_prob, expected_value, post_gate_kept, post_within_hypothesis, unexpected_reason, voided_at, void_reason, completed_at"
      )
      .eq("id", logId)
      .single();

    if (error) return reportError("未完ログ取得失敗", error);
    const log = data as HistoryLog;
    setCompleteLog(log);
    setCompleteSuccessProb(log.success_prob);
    setCompleteExpectedValue(log.expected_value);
    setCompletePostGateKept(log.post_gate_kept);
    setCompletePostWithinHypo(log.post_within_hypothesis);
    setCompleteUnexpectedReason(log.unexpected_reason ?? "");
  };

  const voidLog = async () => {
    setStatus("");
    if (!historyTarget) return setStatus("対象ログを選んでください。");
    const reason = voidReason.trim();
    if (!reason) return setStatus("訂正理由を入力してください。");
    const { error } = await supabase
      .from("trade_logs")
      .update({ voided_at: new Date().toISOString(), void_reason: reason })
      .eq("id", historyTarget.id);
    if (error) return reportError("訂正失敗", error);
    setStatus("✅ 訂正（無効化）しました。");
    setVoidReason("");
    await loadHistory();
    await loadWeeklyCount();
    await loadPending();
  };

  const sendMemberMessage = async () => {
    setStatus("");
    if (!session?.user?.id) return setStatus("未ログインです。");
    const body = memberDmInput.trim();
    if (!body) return;
    if (memberThreads.length === 0) {
      return setStatus("先生からのDMが届いたら返信できます。");
    }
    const threadId = memberThreads[0].id;
    const { error } = await supabase.from("dm_messages").insert([
      { thread_id: threadId, sender_user_id: session.user.id, body },
    ]);
    if (error) return setStatus(`DM送信失敗: ${error.message}`);
    setMemberDmInput("");
    await loadMemberDm();
  };

  const loadReviewQueue = async () => {
    setStatus("");
    const { data, error } = await supabase
      .from("v_review_queue")
      .select(
        "log_id, occurred_at, log_type, user_id, member_id, display_name, email, gate_trade_count_ok, gate_rr_ok, gate_risk_ok, gate_rule_ok, success_prob, expected_value, post_gate_kept, post_within_hypothesis, unexpected_reason, teacher_review, teacher_note, teacher_reviewed_at, voided_at"
      )
      .order("occurred_at", { ascending: false })
      .limit(10);

    if (error) return reportError("レビューキュー取得失敗", error);
    const rows = (data ?? []) as ReviewQueueRow[];
    setReviewQueue(rows);
    void loadProfileNames(rows.map((r) => r.user_id));
  };

  const loadUnfinishedQueue = async () => {
    setStatus("");
    const { data, error } = await supabase
      .from("v_unfinished_queue")
      .select(
        "log_id, occurred_at, user_id, member_id, display_name, email, hours_since, is_over_24h, followup_sent_at"
      )
      .order("is_over_24h", { ascending: false })
      .order("occurred_at", { ascending: true })
      .limit(10);

    if (error) return reportError("未完タスク取得失敗", error);
    const rows = (data ?? []) as UnfinishedQueueRow[];
    setUnfinishedQueue(rows);
    void loadProfileNames(rows.map((r) => r.user_id));
  };

  async function loadUnlockCandidates() {
    try {
      setStatus("");
      const { data, error } = await supabase
        .from("v_unlock_candidates")
        .select(
          "user_id, member_id, display_name, email, weekly_limit, suggested_weekly_limit, valid_count_14, invalid_count_14, risk_ok_rate_14, rule_ok_rate_14, last_log_at"
        )
        .order("last_log_at", { ascending: false })
        .limit(10);

      if (error) return reportError("解放候補取得失敗", error);
      const rows = (data ?? []) as UnlockCandidateRow[];
      setUnlockCandidates(rows);
      void loadProfileNames(rows.map((r) => r.user_id));
    } catch (err) {
      reportError("解放候補取得失敗", err as { message?: string; details?: string });
    }
  }

  const loadRiskQueue = async () => {
    setStatus("");
    const { data, error } = await supabase
      .from("v_risk_queue")
      .select(
        "user_id, member_id, display_name, email, invalid_7, skip_7, valid_7, weekly_limit, alert_invalid, alert_skip0, alert_over_weekly, last_log_id, last_log_at"
      )
      .order("invalid_7", { ascending: false })
      .limit(10);

    if (error) return reportError("危険信号取得失敗", error);
    const rows = (data ?? []) as RiskQueueRow[];
    setRiskQueue(rows);
    void loadProfileNames(rows.map((r) => r.user_id));
  };

  const loadAdminLogs = async () => {
    setStatus("");
    let query = supabase
      .from("trade_logs")
      .select(
        "id, occurred_at, log_type, user_id, member_id, gate_trade_count_ok, gate_rr_ok, gate_risk_ok, gate_rule_ok, success_prob, expected_value, post_gate_kept, post_within_hypothesis, unexpected_reason, teacher_review, teacher_note, teacher_reviewed_at, voided_at, members(display_name, email)"
      )
      .order("occurred_at", { ascending: false })
      .limit(50);

    if (filterPeriod !== "all") {
      const days = filterPeriod === "7" ? 7 : 30;
      query = query.gte("occurred_at", daysAgo(days).toISOString());
    }
    if (filterLogType !== "all") {
      query = query.eq("log_type", filterLogType);
    }
    if (filterReview !== "all") {
      if (filterReview === "none") {
        query = query.or("teacher_review.is.null,teacher_review.eq.");
      } else {
        query = query.eq("teacher_review", filterReview);
      }
    }
    if (filterMemberQuery.trim()) {
      const q = filterMemberQuery.trim();
      query = query.or(
        `member_id.ilike.%${q}%,members.display_name.ilike.%${q}%,members.email.ilike.%${q}%`
      );
    }

    const { data, error } = await query;
    if (error) return reportError("一覧取得失敗", error);
    const rows = (data ?? []).map((l: any) => ({
      ...l,
      display_name: l.members?.[0]?.display_name ?? null,
      email: l.members?.[0]?.email ?? null,
    })) as AdminLogRow[];
    setAdminLogs(rows);
    void loadProfileNames(rows.map((r) => r.user_id));
  };

  const loadAdminSettings = async (userId: string) => {
    const { data, error } = await supabase
      .from("member_settings")
      .select("member_user_id, weekly_limit, max_risk_percent, unlocked, note")
      .eq("member_user_id", userId)
      .maybeSingle();
    if (error) return reportError("設定取得失敗", error);
    if (!data) {
      const { data: created, error: createError } = await supabase
        .from("member_settings")
        .upsert(
          {
            member_user_id: userId,
            weekly_limit: 2,
            max_risk_percent: 2,
            unlocked: false,
            note: null,
          },
          { onConflict: "member_user_id" }
        )
        .select("member_user_id, weekly_limit, max_risk_percent, unlocked, note")
        .single();
      if (createError) return reportError("設定初期化失敗", createError);
      const s = created as MemberSettings;
      setAdminWeeklyLimit(s.weekly_limit);
      setAdminMaxRisk(s.max_risk_percent);
      setAdminUnlocked(s.unlocked);
      setAdminSettingsNote(s.note ?? "");
      return;
    }
    const s = data as MemberSettings;
    setAdminWeeklyLimit(s.weekly_limit);
    setAdminMaxRisk(s.max_risk_percent);
    setAdminUnlocked(s.unlocked);
    setAdminSettingsNote(s.note ?? "");
  };

  const saveAdminSettings = async (userId: string) => {
    setStatus("");
    const payload = {
      member_user_id: userId,
      weekly_limit: adminWeeklyLimit,
      max_risk_percent: adminMaxRisk,
      unlocked: adminUnlocked,
      note: adminSettingsNote.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("member_settings").upsert(payload, {
      onConflict: "member_user_id",
    });
    if (error) return reportError("設定保存失敗", error);
    setStatus("✅ 個別設定を更新しました。");
    await loadAdminSettings(userId);
    if (session?.user?.id === userId) {
      await loadMemberSettings();
      await loadWeeklyCount();
    }
  };

  const saveTeacherReview = async (value: "ok" | "warn" | "inspect") => {
    setStatus("");
    if (!adminSelectedLog) return setStatus("ログを選んでください。");
    const note = adminNoteInput.trim();
    const payload = {
      teacher_review: value,
      teacher_note: note || null,
      teacher_reviewed_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("trade_logs")
      .update(payload)
      .eq("id", "log_id" in adminSelectedLog ? adminSelectedLog.log_id : adminSelectedLog.id);
    if (error) return reportError("レビュー更新失敗", error);
    setAdminNoteInput("");
    setStatus("✅ レビューを保存しました。");
    await loadReviewQueue();
    await loadRiskQueue();
    await loadAdminLogs();
  };

  const sendFollowupDm = async (row: UnfinishedQueueRow) => {
    setStatus("");
    if (!session?.user?.id) return setStatus("未ログインです。");
    if (!row.user_id) return setStatus("ユーザーIDが見つかりません。");
    if (row.followup_sent_at) return setStatus("既に送信済みです。");

    const body =
      `記録ありがとうございます。取引後のチェックが未完のようです。結果ではなく“想定内/外”の判定だけでOKなので、1分で仕上げてください。こちらから続きが入力できます：/complete/${row.log_id}`;

    const { data: threads } = await supabase
      .from("dm_threads")
      .select("id")
      .eq("member_user_id", row.user_id)
      .eq("teacher_user_id", session.user.id)
      .limit(1);
    let threadId = (threads ?? [])[0]?.id as string | undefined;
    if (!threadId) {
      const { data: created, error: createError } = await supabase
        .from("dm_threads")
        .insert([{ member_user_id: row.user_id, teacher_user_id: session.user.id }])
        .select("id")
        .single();
      if (createError) return reportError("スレッド作成失敗", createError);
      threadId = created?.id;
    }
    if (!threadId) return;

    const { error: msgError } = await supabase.from("dm_messages").insert([
      { thread_id: threadId, sender_user_id: session.user.id, body },
    ]);
    if (msgError) return reportError("DM送信失敗", msgError);

    const { error: followupError } = await supabase
      .from("trade_logs")
      .update({ followup_sent_at: new Date().toISOString() })
      .eq("id", row.log_id);
    if (followupError) return reportError("フォロー更新失敗", followupError);

    setStatus("✅ 催促DMを送信しました。");
    await loadUnfinishedQueue();
  };

  const unlockMember = async (userId: string) => {
    setStatus("");
    const candidate = unlockCandidates.find((c) => c.user_id === userId);
    const weeklyLimit = candidate?.suggested_weekly_limit ?? 3;
    const { error } = await supabase
      .from("member_settings")
      .upsert(
        {
          member_user_id: userId,
          weekly_limit: weeklyLimit,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "member_user_id" }
      );
    if (error) return reportError("解放失敗", error);
    setStatus(`✅ 週上限を ${weeklyLimit} に更新しました。`);
    await loadUnlockCandidates();
    await loadRiskQueue();
  };


  // ----------------------
  // 保存：取引前
  // ----------------------
  const savePre = async () => {
    setStatus("");
    if (!session?.user?.id) return setStatus("未ログインです。");
    if (weeklyLocked && !isTestMode) {
      return setStatus(labels.weeklyLimitReached);
    }

    const balance = Number(accountBalance);
    const stopLoss = Number(stopLossAmount);
    const takeProfit = Number(takeProfitAmount);
    const rr = stopLoss > 0 && takeProfit > 0 ? takeProfit / stopLoss : null;
    const riskPct = balance > 0 && stopLoss > 0 ? (stopLoss / balance) * 100 : null;
    const rrOk = rr !== null && rr >= 3;
    const riskOk = riskPct !== null && riskPct <= 2;

    // Gateが全部Noじゃないか等の判定はUIで見せる
    if (!rrOk || !riskOk || !gate.gate_rule_ok) {
      return setStatus(copy.gate.verdictBlocked);
    }
    if (!successProb || !expectedValue) {
      return setStatus("仮説（成功確率・期待値）を選んでください。");
    }

    const payload = {
      user_id: session.user.id,
      log_type: "valid" as const,
      ...gate,
      gate_trade_count_ok: true,
      gate_rr_ok: rrOk,
      gate_risk_ok: riskOk,
      success_prob: successProb,
      expected_value: expectedValue,
      // post はあとで
    };
    const { data, error } = await supabase
      .from("trade_logs")
      .insert([payload])
      .select(
        "id, occurred_at, log_type, gate_all_ok, success_prob, expected_value, post_gate_kept, post_within_hypothesis, unexpected_reason, voided_at, completed_at"
      )
      .single();

    if (error) {
      reportError("保存失敗", error);
      return;
    }

    const newLog: TradeLogLite = {
      id: data.id,
      occurred_at: data.occurred_at,
      log_type: data.log_type,
      gate_all_ok: data.gate_all_ok ?? gateAllOk,
      success_prob: data.success_prob ?? successProb,
      expected_value: data.expected_value ?? expectedValue,
      post_gate_kept: data.post_gate_kept ?? null,
      post_within_hypothesis: data.post_within_hypothesis ?? null,
      unexpected_reason: data.unexpected_reason ?? null,
      voided_at: data.voided_at ?? null,
      completed_at: data.completed_at ?? null,
    };

    setActiveLog(newLog);
    setCurrentLogId(newLog.id);
    setPending(newLog);
    setStatus("✅ 記録しました。取引後のチェックを入れてください。");
    resetPre();
    setMode("post");
    void loadPending();
    void loadWeeklyCount();
    void loadHistory();
    void loadMemberSettings();
  };

  // ----------------------
  // 保存：取引後
  // ----------------------
  const savePost = async () => {
    setStatus("");
    const target = pending ?? activeLog;
    const targetId = target?.id ?? currentLogId;
    if (!targetId) {
      return setStatus("未完の記録がありません（取引前を先に記録してください）。");
    }

    if (postGateKept === null || postWithinHypo === null) {
      return setStatus("事後チェック（はい/いいえ）を選んでください。");
    }
    const isUnexpected = postGateKept === false || postWithinHypo === false;
    if (isUnexpected && unexpectedReason.trim().length === 0) {
      return setStatus("想定外がある場合は、原因（事実）を1行で入力してください。");
    }

    const { error } = await supabase
      .from("trade_logs")
      .update({
        post_gate_kept: postGateKept,
        post_within_hypothesis: postWithinHypo,
        unexpected_reason: unexpectedReason.trim() ? unexpectedReason.trim() : null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", targetId);

    if (error) {
      reportError("更新失敗", error);
      return;
    }

    setStatus("✅ 事後チェックを記録しました（感想は不要。事実だけ積み上がりました）。");
    resetPost();
    setPending(null);
    setActiveLog(null);
    setCurrentLogId(null);
    void loadPending();
    void loadWeeklyCount();
    void loadHistory();
    setMode("home");
  };

  const saveCompletion = async () => {
    setStatus("");
    if (!completeLog) return setStatus("対象ログが見つかりません。");
    if (!completeSuccessProb || !completeExpectedValue) {
      return setStatus("仮説（成功確率・期待値）を選んでください。");
    }
    if (completePostGateKept === null || completePostWithinHypo === null) {
      return setStatus("事後チェック（はい/いいえ）を選んでください。");
    }
    const isUnexpected = completePostGateKept === false || completePostWithinHypo === false;
    if (isUnexpected && completeUnexpectedReason.trim().length === 0) {
      return setStatus("想定外がある場合は、原因（事実）を1行で入力してください。");
    }

    const { error } = await supabase
      .from("trade_logs")
      .update({
        success_prob: completeSuccessProb,
        expected_value: completeExpectedValue,
        post_gate_kept: completePostGateKept,
        post_within_hypothesis: completePostWithinHypo,
        unexpected_reason: completeUnexpectedReason.trim() ? completeUnexpectedReason.trim() : null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", completeLog.id);

    if (error) return reportError("未完更新失敗", error);
    setStatus("✅ 未完記録を完了しました。");
    setCompleteLog(null);
    setCompleteSuccessProb(null);
    setCompleteExpectedValue(null);
    setCompletePostGateKept(null);
    setCompletePostWithinHypo(null);
    setCompleteUnexpectedReason("");
    void loadHistory();
    void loadPending();
    void loadWeeklyCount();
    window.history.pushState({}, "", "/");
    setMode("history");
  };

  // ----------------------
  // UI
  // ----------------------
  if (!session) {
    return (
      <div style={{ maxWidth: 600, margin: "var(--space-2xl) auto", padding: "0 var(--space-md)" }}>
        <h2 className="shimmer-text" style={{ marginBottom: "var(--space-sm)", textAlign: "center" }}>FX Journal MVP（初心者モード）</h2>
        <p style={{ opacity: 0.85, marginBottom: "var(--space-lg)", textAlign: "center" }}>
          使うのは2つだけ：<b>取引前（30秒）</b> と <b>取引後（15秒）</b>
        </p>

        <div style={{ display: "flex", gap: "var(--space-md)", flexDirection: "column", alignItems: "center" }}>
          <input
            style={{ width: "100%" }}
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <PrimaryButton onClick={sendMagicLink} style={{ width: "100%" }}>ログイン</PrimaryButton>
        </div>

        {status && <p style={{ marginTop: "var(--space-md)", color: "var(--color-accent)", fontWeight: 600, textAlign: "center" }}>{status}</p>}
      </div>
    );
  }

  if (isAdminRoute && !isTeacher) {
    return (
      <div style={{ maxWidth: 640, margin: "var(--space-2xl) auto", padding: "0 var(--space-md)" }}>
        <h2 style={{ marginBottom: "var(--space-sm)", textAlign: "center" }}>管理ポータル</h2>
        <p style={{ opacity: 0.85, marginBottom: "var(--space-lg)", textAlign: "center" }}>このアカウントではアクセスできません。</p>
        <div style={{ display: "flex", gap: "var(--space-md)", flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={() => { window.location.href = "/"; }}>ユーザー画面へ戻る</button>
          <button onClick={signOut} style={{ color: "var(--color-danger)" }}>ログアウト</button>
        </div>
      </div>
    );
  }

  if (isAdminRoute && isTeacher) {
    return (
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 0 var(--space-xl) 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-md)", flexWrap: "wrap", alignItems: "center", marginBottom: "var(--space-lg)", padding: "var(--space-md)" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24 }}>{labels.adminTitle}</h2>
            <div className="text-muted" style={{ marginTop: 4 }}>
              Staff: {profileDisplayName ?? session.user.email}
            </div>
          </div>
          <div style={{ display: "flex", gap: "var(--space-md)", flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={() => { window.location.href = "/admin"; }}>先生ホーム</button>
            <button onClick={() => { window.location.href = "/admin/logs"; }}>{labels.adminLogs}</button>
            <button onClick={() => { window.location.href = "/"; }}>ユーザー画面</button>
            <button onClick={signOut} style={{ color: "var(--color-danger)" }}>ログアウト</button>
          </div>
        </div>

        {status && (
          <div style={{ margin: "12px 0", padding: 10, border: "1px solid #333" }}>{status}</div>
        )}

        {!isAdminLogsRoute && (
          <Card className="card-accent" style={{ background: "rgba(43, 109, 224, 0.03)", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <IconSafety />
              <div style={{ fontWeight: 600 }}>{copy.banner.admin}</div>
            </div>
          </Card>
        )}

        {isAdminLogsRoute ? (
          <>
            <Card>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
                <IconHistory />
                <h3 style={{ margin: 0 }}>{labels.adminLogs}</h3>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                <input
                  style={{ flex: 1, padding: 10, minWidth: 200 }}
                  placeholder="ID / Email / 名前..."
                  value={filterMemberQuery}
                  onChange={(e) => setFilterMemberQuery(e.target.value)}
                />
                <select style={{ padding: "8px 12px" }} value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value as any)}>
                  <option value="7">直近7日</option>
                  <option value="30">直近30日</option>
                  <option value="all">全期間</option>
                </select>
                <select style={{ padding: "8px 12px" }} value={filterLogType} onChange={(e) => setFilterLogType(e.target.value as any)}>
                  <option value="all">全種別</option>
                  <option value="valid">valid</option>
                  <option value="skip">skip</option>
                  <option value="invalid">invalid</option>
                </select>
                <select style={{ padding: "8px 12px" }} value={filterReview} onChange={(e) => setFilterReview(e.target.value as any)}>
                  <option value="all">レビュー全て</option>
                  <option value="none">未レビュー</option>
                  <option value="ok">ok</option>
                  <option value="warn">warn</option>
                  <option value="inspect">inspect</option>
                </select>
                <PrimaryButton onClick={() => void loadAdminLogs()} style={{ minWidth: 100, padding: "10px 20px" }}>検索</PrimaryButton>
              </div>
              <div style={{ maxHeight: 400, overflow: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                {adminLogs.length === 0 ? (
                  <div className="text-muted" style={{ textAlign: "center", padding: "40px 0" }}>ログがありません。</div>
                ) : (
                    adminLogs.map((l) => {
                      const selectedId = adminSelectedLog ? ("log_id" in adminSelectedLog ? adminSelectedLog.log_id : adminSelectedLog.id) : null;
                      const active = selectedId === l.id;
                      return (
                        <button
                          key={l.id}
                          onClick={() => {
                            setAdminSelectedLog(l);
                            setAdminNoteInput(l.teacher_note ?? "");
                            if (l.user_id) void loadAdminSettings(l.user_id);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "12px 16px",
                            borderRadius: "var(--radius-md)",
                            border: "1px solid var(--color-border)",
                            backgroundColor: active ? "rgba(43, 109, 224, 0.05)" : "var(--color-card)",
                            borderColor: active ? "var(--color-accent)" : "var(--color-border)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <NameBadge
                                name={displayNameFor(l.user_id, l.display_name, l.member_id, l.email)}
                                userId={l.user_id}
                              />
                              <span style={{ fontWeight: 700 }}>{displayNameFor(l.user_id, l.display_name, l.member_id, l.email)}</span>
                            </div>
                            <div className="text-muted" style={{ fontSize: 12 }}>
                              {new Date(l.occurred_at).toLocaleString()}
                            </div>
                          </div>
                          <div style={{ marginTop: 6, display: "flex", gap: 12, fontSize: 12 }} className="text-muted">
                            <span>種別: {l.log_type}</span>
                            <span>レビュー: <span style={{ color: l.teacher_review ? "var(--color-accent)" : "inherit", fontWeight: 600 }}>{l.teacher_review ?? "未"}</span></span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </Card>
            </>
          ) : (
            <Card>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
              <div>
                <h3 style={{ marginBottom: 16, fontSize: 18 }}>{labels.adminTodo}</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                  <button
                    onClick={() => {
                      setShowFollowupQueue((v) => !v);
                      setShowReviewQueue(false);
                      setShowRiskQueue(false);
                      setShowUnlockQueue(false);
                    }}
                    style={{ 
                      display: "flex", flexDirection: "column", alignItems: "center", padding: "20px", gap: 10,
                      borderColor: showFollowupQueue ? "var(--color-accent)" : "var(--color-border)",
                      background: showFollowupQueue ? "rgba(43, 109, 224, 0.05)" : "var(--color-card)"
                    }}
                  >
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-accent)" }}>{unfinishedQueue.length}</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{labels.adminTodoFollowup}</div>
                  </button>
                  <button
                    onClick={() => {
                      setShowReviewQueue((v) => !v);
                      setShowFollowupQueue(false);
                      setShowRiskQueue(false);
                      setShowUnlockQueue(false);
                    }}
                    style={{ 
                      display: "flex", flexDirection: "column", alignItems: "center", padding: "20px", gap: 10,
                      borderColor: showReviewQueue ? "var(--color-accent)" : "var(--color-border)",
                      background: showReviewQueue ? "rgba(43, 109, 224, 0.05)" : "var(--color-card)"
                    }}
                  >
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-accent)" }}>{reviewQueue.length}</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{labels.adminTodoReview}</div>
                  </button>
                  <button
                    onClick={() => {
                      setShowRiskQueue((v) => !v);
                      setShowFollowupQueue(false);
                      setShowReviewQueue(false);
                      setShowUnlockQueue(false);
                    }}
                    style={{ 
                      display: "flex", flexDirection: "column", alignItems: "center", padding: "20px", gap: 10,
                      borderColor: showRiskQueue ? "var(--color-accent)" : "var(--color-border)",
                      background: showRiskQueue ? "rgba(43, 109, 224, 0.05)" : "var(--color-card)"
                    }}
                  >
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-danger)" }}>{riskQueue.length}</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{labels.adminTodoSafety}</div>
                  </button>
                  <button
                    onClick={() => {
                      setShowUnlockQueue((v) => !v);
                      setShowFollowupQueue(false);
                      setShowReviewQueue(false);
                      setShowRiskQueue(false);
                    }}
                    style={{ 
                      display: "flex", flexDirection: "column", alignItems: "center", padding: "20px", gap: 10,
                      borderColor: showUnlockQueue ? "var(--color-accent)" : "var(--color-border)",
                      background: showUnlockQueue ? "rgba(43, 109, 224, 0.05)" : "var(--color-card)"
                    }}
                  >
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-accent)" }}>{unlockCandidates.length}</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>解放候補</div>
                  </button>
                </div>
              </div>

              {showFollowupQueue && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 16 }}>{labels.adminQueueFollowup}</h3>
                    <button onClick={() => void loadUnfinishedQueue()}>更新</button>
                  </div>
                  <div style={{ maxHeight: 300, overflow: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                    {unfinishedQueue.length === 0 ? (
                      <div className="text-muted">未完はありません。</div>
                    ) : (
                      unfinishedQueue.map((l) => (
                        <div
                          key={l.log_id}
                          style={{
                            padding: "12px 16px",
                            borderRadius: "var(--radius-md)",
                            border: "1px solid var(--color-border)",
                            opacity: l.followup_sent_at ? 0.6 : 1,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <NameBadge
                                name={displayNameFor(l.user_id, l.display_name, l.member_id, l.email)}
                                userId={l.user_id}
                              />
                              <span style={{ fontWeight: 700 }}>{displayNameFor(l.user_id, l.display_name, l.member_id, l.email)}</span>
                            </div>
                            <div className="text-muted" style={{ marginTop: 4, marginLeft: 30 }}>
                              経過 {Math.floor(l.hours_since)}h{l.is_over_24h ? " / 24h超" : ""}
                            </div>
                          </div>
                          <button
                            onClick={() => void sendFollowupDm(l)}
                            disabled={!!l.followup_sent_at}
                            style={{ padding: "6px 16px", background: l.followup_sent_at ? "transparent" : "var(--color-accent)", color: l.followup_sent_at ? "var(--color-text-muted)" : "#fff", border: l.followup_sent_at ? "1px solid var(--color-border)" : "none" }}
                          >
                            {l.followup_sent_at ? "送信済み" : "催促DM"}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {showReviewQueue && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 16 }}>{labels.adminQueueReview}</h3>
                    <button onClick={() => void loadReviewQueue()}>更新</button>
                  </div>
                  <div style={{ maxHeight: 300, overflow: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                    {reviewQueue.length === 0 ? (
                      <div className="text-muted">未レビューはありません。</div>
                    ) : (
                      reviewQueue.map((l) => {
                        const important =
                          l.post_gate_kept === false ||
                          l.post_within_hypothesis === false ||
                          !!l.unexpected_reason;
                        const summary =
                          l.post_gate_kept === null || l.post_within_hypothesis === null
                            ? "未完"
                            : "記録済み";
                        const selectedId = adminSelectedLog ? ("log_id" in adminSelectedLog ? adminSelectedLog.log_id : adminSelectedLog.id) : null;
                        const active = selectedId === l.log_id;
                        return (
                          <button
                            key={l.log_id}
                            onClick={() => {
                              setAdminSelectedLog(l);
                              setAdminNoteInput(l.teacher_note ?? "");
                              if (l.user_id) void loadAdminSettings(l.user_id);
                            }}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              padding: "12px 16px",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--color-border)",
                              backgroundColor: active ? "rgba(43, 109, 224, 0.05)" : "var(--color-card)",
                              borderColor: active ? "var(--color-accent)" : "var(--color-border)",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <NameBadge
                                  name={displayNameFor(l.user_id, l.display_name, l.member_id, l.email)}
                                  userId={l.user_id}
                                />
                                <span style={{ fontWeight: 700 }}>{displayNameFor(l.user_id, l.display_name, l.member_id, l.email)}</span>
                              </div>
                              <div style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: important ? "var(--color-danger-bg)" : "rgba(0,0,0,0.04)", color: important ? "var(--color-danger)" : "inherit", fontWeight: 700 }}>
                                {important ? "要注意" : "通常"}
                              </div>
                            </div>
                            <div className="text-muted" style={{ marginTop: 6, marginLeft: 30 }}>
                              {new Date(l.occurred_at).toLocaleString()} / {summary}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {showRiskQueue && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 16 }}>{labels.adminQueueRisk}</h3>
                    <button onClick={() => void loadRiskQueue()}>更新</button>
                  </div>
                  <div style={{ maxHeight: 300, overflow: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                    {riskQueue.length === 0 ? (
                      <div className="text-muted">警告はありません。</div>
                    ) : (
                      riskQueue.map((r) => {
                        const tags = [
                          r.alert_invalid ? "無効2回以上" : null,
                          r.alert_skip0 ? "見送り0" : null,
                          r.alert_over_weekly ? "週上限超過" : null,
                        ].filter(Boolean);
                        return (
                          <div
                            key={`${r.user_id ?? "unknown"}-${r.member_id ?? "m"}`}
                            style={{
                              padding: "12px 16px",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--color-border)",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center"
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <NameBadge
                                  name={displayNameFor(r.user_id, r.display_name, r.member_id, r.email)}
                                  userId={r.user_id}
                                />
                                <span style={{ fontWeight: 700 }}>{displayNameFor(r.user_id, r.display_name, r.member_id, r.email)}</span>
                              </div>
                              <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap", marginLeft: 30 }}>
                                {tags.map(t => (
                                  <span key={t} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--color-danger-bg)", color: "var(--color-danger)", fontWeight: 700 }}>{t}</span>
                                ))}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                if (r.last_log_id) {
                                  const log = adminLogs.find((l) => l.id === r.last_log_id);
                                  if (log) {
                                    setAdminSelectedLog(log);
                                    if (log.user_id) void loadAdminSettings(log.user_id);
                                  }
                                }
                              }}
                              style={{ padding: "6px 16px", borderColor: "var(--color-danger)", color: "var(--color-danger)" }}
                            >
                              確認
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {showUnlockQueue && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 16 }}>{labels.adminQueueUnlock}</h3>
                    <button onClick={() => void loadUnlockCandidates()}>更新</button>
                  </div>
                  <div style={{ maxHeight: 300, overflow: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                    {unlockCandidates.length === 0 ? (
                      <div className="text-muted">候補なし</div>
                    ) : (
                      unlockCandidates.map((u) => (
                        <div
                          key={u.user_id}
                          style={{
                            padding: "12px 16px",
                            borderRadius: "var(--radius-md)",
                            border: "1px solid var(--color-border)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <NameBadge
                                name={displayNameFor(u.user_id, u.display_name, u.member_id, u.email)}
                                userId={u.user_id}
                              />
                              <span style={{ fontWeight: 700 }}>{displayNameFor(u.user_id, u.display_name, u.member_id, u.email)}</span>
                            </div>
                            <div className="text-muted" style={{ marginTop: 4, marginLeft: 30, fontSize: 12 }}>
                              記録:{u.valid_count_14} / 判定OK:{Math.round(u.risk_ok_rate_14 * 100)}%
                            </div>
                          </div>
                          <button onClick={() => void unlockMember(u.user_id)} style={{ padding: "6px 16px", background: "var(--color-accent)", color: "#fff", border: "none" }}>{labels.adminUnlock}</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        <Card className="card-accent">
          <h3 style={{ marginBottom: 20 }}>詳細パネル</h3>
          {!adminSelectedLog ? (
            <div className="text-muted" style={{ textAlign: "center", padding: "40px 0" }}>左のキュー/一覧からログを選んでください。</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ padding: 16, background: "rgba(0,0,0,0.03)", borderRadius: "var(--radius-md)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <NameBadge
                      name={displayNameFor(adminSelectedLog.user_id ?? null, adminSelectedLog.display_name, adminSelectedLog.member_id, adminSelectedLog.email)}
                      userId={adminSelectedLog.user_id}
                    />
                    <span style={{ fontWeight: 700 }}>{displayNameFor(adminSelectedLog.user_id ?? null, adminSelectedLog.display_name, adminSelectedLog.member_id, adminSelectedLog.email)}</span>
                  </div>
                  <div className="text-muted" style={{ fontSize: 12 }}>{new Date(adminSelectedLog.occurred_at).toLocaleString()}</div>
                </div>
                <div className="text-muted" style={{ marginTop: 6, marginLeft: 30, fontSize: 13 }}>種別: {adminSelectedLog.log_type}</div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--color-text-muted)" }}>前提（Gate）</div>
                <div style={{ fontSize: 13, background: "rgba(0,0,0,0.03)", padding: 12, borderRadius: "var(--radius-sm)" }}>
                  {` 回数:${adminSelectedLog.gate_trade_count_ok ? "○" : "×"} / ` +
                    `RR:${adminSelectedLog.gate_rr_ok ? "○" : "×"} / ` +
                    `リスク:${adminSelectedLog.gate_risk_ok ? "○" : "×"} / ` +
                    `ルール:${adminSelectedLog.gate_rule_ok ? "○" : "×"}`}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--color-text-muted)" }}>成功確率</div>
                  <div style={{ fontSize: 14 }}>{labelProb(adminSelectedLog.success_prob)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--color-text-muted)" }}>期待値</div>
                  <div style={{ fontSize: 14 }}>{labelEV(adminSelectedLog.expected_value)}</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--color-text-muted)" }}>事後チェック</div>
                <div style={{ fontSize: 14 }}>
                  {adminSelectedLog.post_gate_kept === null ? "未完" : adminSelectedLog.post_gate_kept ? "✅ 守れた" : "❌ 破った"} /
                  {adminSelectedLog.post_within_hypothesis === null ? "未完" : adminSelectedLog.post_within_hypothesis ? "🎯 想定内" : "❓ 想定外"}
                </div>
              </div>

              {adminSelectedLog.unexpected_reason && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--color-text-muted)" }}>想定外の原因</div>
                  <div style={{ fontSize: 13, fontStyle: "italic", borderLeft: "2px solid var(--color-danger)", paddingLeft: 10, color: "var(--color-danger)" }}>
                    {adminSelectedLog.unexpected_reason}
                  </div>
                </div>
              )}

              <div style={{ paddingTop: 16, borderTop: "1px dashed var(--color-border)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--color-text-muted)" }}>先生レビュー（スタンプ）</div>
                <textarea
                  style={{ width: "100%", minHeight: 80, padding: 12, marginBottom: 12 }}
                  maxLength={200}
                  placeholder="フィードバックを入力..."
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => void saveTeacherReview("ok")} style={{ flex: 1, padding: "10px" }}>👍 構造OK</button>
                  <button onClick={() => void saveTeacherReview("warn")} style={{ flex: 1, padding: "10px" }}>⚠️ 構造ズレ</button>
                  <button onClick={() => void saveTeacherReview("inspect")} style={{ flex: 1, padding: "10px" }}>🔍 検証対象</button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {adminSelectedLog && adminSelectedLog.user_id && (
          <Card>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>個別設定</h3>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label className="text-muted" style={{ display: "block", marginBottom: 6 }}>週上限</label>
                <input
                  style={{ width: "100%" }}
                  type="number"
                  value={adminWeeklyLimit}
                  onChange={(e) => setAdminWeeklyLimit(Number(e.target.value))}
                />
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label className="text-muted" style={{ display: "block", marginBottom: 6 }}>最大リスク%</label>
                <input
                  style={{ width: "100%" }}
                  type="number"
                  value={adminMaxRisk}
                  onChange={(e) => setAdminMaxRisk(Number(e.target.value))}
                />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={adminUnlocked}
                    onChange={(e) => setAdminUnlocked(e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  制限を解放
                </label>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="text-muted" style={{ display: "block", marginBottom: 6 }}>スタッフ用メモ（任意）</label>
              <textarea
                style={{ width: "100%", minHeight: 60 }}
                placeholder="..."
                value={adminSettingsNote}
                onChange={(e) => setAdminSettingsNote(e.target.value)}
              />
            </div>
            <PrimaryButton onClick={() => void saveAdminSettings(adminSelectedLog.user_id!)} style={{ width: "100%" }}>
              設定を保存する
            </PrimaryButton>
          </Card>
        )}
      </div>
    );
  }

  const completedLogIds = new Set(
    historyLogs.filter((l) => l.completed_at).map((l) => l.id)
  );
  const visibleMessages = memberMessages.filter((m) => {
    const logId = extractCompleteLogId(m.body);
    if (logId) return !completedLogIds.has(logId);
    const isFollowup =
      m.body.includes("取引後のチェック") && m.body.includes("想定内/外");
    if (isFollowup && !pending) return false;
    return true;
  });

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 0 var(--space-xl) 0", minHeight: "100vh" }}>
      {/* Header */}
      <header style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        padding: "var(--space-md) var(--space-md)",
        marginBottom: "var(--space-lg)",
        borderBottom: "1px solid var(--color-border)"
      }}>
        <div onClick={() => setMode("home")} style={{ cursor: "pointer" }}>
          <h2 className="shimmer-text" style={{ margin: 0, fontSize: 24 }}>{labels.appTitle}</h2>
          <div className="text-muted" style={{ fontSize: 13 }}>
            {profileDisplayName ?? session.user.email}
          </div>
        </div>
        
        <div style={{ position: "relative" }}>
          <button 
            onClick={() => setShowMenu(!showMenu)} 
            style={{ 
              padding: "var(--space-sm)", 
              minWidth: 48, 
              height: 48, 
              background: "transparent", 
              border: "none",
              color: "var(--color-text)" 
            }}
            aria-label="Menu"
          >
            {showMenu ? <IconClose /> : <IconMenu />}
          </button>

          {showMenu && (
            <div style={{ 
              position: "absolute", 
              top: "100%", 
              right: 0, 
              marginTop: 8,
              background: "var(--color-card)", 
              border: "1px solid var(--color-border)", 
              borderRadius: "var(--radius-md)", 
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              zIndex: 100,
              width: 220,
              overflow: "hidden"
            }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <button 
                  onClick={() => { setMode("home"); setStatus(""); setShowMenu(false); }}
                  style={{ width: "100%", border: "none", borderRadius: 0, justifyContent: "flex-start", padding: "16px 20px" }}
                >
                  <IconNext /> ホーム
                </button>
                <button 
                  onClick={() => { setMode("history"); setShowMenu(false); }}
                  style={{ width: "100%", border: "none", borderRadius: 0, justifyContent: "flex-start", padding: "16px 20px" }}
                >
                  <IconHistory /> 履歴
                </button>
                {isTeacher && (
                  <button 
                    onClick={() => { window.location.href = "/admin"; }}
                    style={{ width: "100%", border: "none", borderRadius: 0, justifyContent: "flex-start", padding: "16px 20px" }}
                  >
                    <IconGear /> 管理
                  </button>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px" }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>テストモード</span>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={isTestMode}
                      onChange={(e) => setTestMode(e.target.checked)}
                      style={{ width: 18, height: 18 }}
                      aria-label="テストモード切替"
                    />
                    <span style={{ fontSize: 12, color: isTestMode ? "var(--color-danger)" : "inherit" }}>
                      {isTestMode ? "ON" : "OFF"}
                    </span>
                  </label>
                </div>
                <div style={{ height: "1px", background: "var(--color-border)" }} />
                <button 
                  onClick={signOut}
                  style={{ width: "100%", border: "none", borderRadius: 0, justifyContent: "flex-start", padding: "16px 20px", color: "var(--color-danger)" }}
                >
                  ログアウト
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {status && (
        <div className="alert-danger" style={{ marginBottom: "var(--space-lg)" }}>{status}</div>
      )}
      {showNameModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            backdropFilter: "blur(4px)",
          }}
        >
          <div className="card" style={{ width: "min(420px, 92%)", padding: 32 }}>
            <h3 style={{ marginBottom: 12 }}>表示名を設定してください</h3>
            <div className="text-muted" style={{ marginBottom: 20, fontSize: 14 }}>
              Discordと同じ名前を入力してください。先生側の一覧表示に使われます。
            </div>
            <input
              style={{ width: "100%", padding: 12, marginBottom: 20 }}
              placeholder="例：Kukyo"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
            />
            <div style={{ display: "flex", gap: 12 }}>
              <PrimaryButton onClick={() => void saveProfileName()} style={{ width: "100%" }}>保存する</PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {mode === "home" && (
        <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
          {/* 1. Next Action (Core) */}
          <Card className="card-accent" style={{ background: "rgba(43, 109, 224, 0.02)", marginTop: 0 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <IconNext />
              <h3 style={{ margin: 0, fontSize: 18 }}>{labels.nextActionTitle}</h3>
            </div>
            
            {pending ? (
              <>
                <div style={{ opacity: 0.85, marginBottom: 16 }}>{copy.nextAction.incomplete}</div>
                <div>
                  <PrimaryButton onClick={() => setMode("post")}>{labels.tradePost}</PrimaryButton>
                </div>
              </>
            ) : weeklyLocked && !isTestMode ? (
              <>
                <div style={{ opacity: 0.85, marginBottom: 16, lineHeight: 1.6 }}>
                  今週の取引は上限に達しました。<br />
                  見送りは上限外で記録できます（1分）<br />
                  <span style={{ fontWeight: 700, color: "var(--color-accent)" }}>（次の取引は：{nextMondayLabel()}）</span>
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <PrimaryButton onClick={() => void saveSkipQuick()}>
                    見送りを記録する
                  </PrimaryButton>
                  <button onClick={() => setMode("history")} style={{ padding: "12px 24px" }}>履歴を見る</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ opacity: 0.85, marginBottom: 16 }}>{copy.nextAction.normal}</div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <PrimaryButton onClick={() => setMode("pre")}>
                    {labels.tradePre}
                  </PrimaryButton>
                  <button
                    onClick={() => void saveSkipQuick()}
                    style={{ fontWeight: 700, padding: "14px 24px" }}
                  >
                    {labels.skip}
                  </button>
                </div>
              </>
            )}
          </Card>

          {/* 2. Today's Stats & Progress */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 0 }}>
            <BigCard style={{ marginTop: 0 }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                <IconStats />
                <h3 style={{ margin: 0, fontSize: 18 }}>今週の進捗</h3>
              </div>
              <div className="text-muted" style={{ marginBottom: 16 }}>
                トレードを「絞る」ことが最大の武器です。
              </div>

              {memberSettings && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                      {weeklyAttempts > memberSettings.weekly_limit ? (
                        <span style={{ color: "#F59E0B" }}>⚠️ 過剰：+{weeklyAttempts - memberSettings.weekly_limit}回</span>
                      ) : (
                        <span>記録済み：{weeklyAttempts} / {memberSettings.weekly_limit}回</span>
                      )}
                    </span>
                    <span style={{ fontSize: 12 }} className="text-muted">
                      {weeklyAttempts >= memberSettings.weekly_limit ? "完了" : `残り ${memberSettings.weekly_limit - weeklyAttempts}回`}
                    </span>
                  </div>
                  
                  <div className="progress-container">
                    <div 
                      className={`progress-bar ${
                        weeklyAttempts > memberSettings.weekly_limit ? "over" : 
                        weeklyAttempts === memberSettings.weekly_limit ? "full" : ""
                      }`}
                      style={{ width: `${Math.min(100, (weeklyAttempts / memberSettings.weekly_limit) * 100)}%` }}
                    />
                  </div>

                  <div style={{ minHeight: 20 }}>
                    {weeklyAttempts === memberSettings.weekly_limit ? (
                      <div style={{ fontSize: 13, color: "var(--color-accent)", fontWeight: 700, textAlign: "center", marginTop: 4 }} className="shimmer-text">
                        ✨ 今週は完璧です！
                      </div>
                    ) : weeklyAttempts > memberSettings.weekly_limit ? (
                      <div style={{ fontSize: 13, color: "#F59E0B", fontWeight: 700, textAlign: "center", marginTop: 4 }}>
                        ⚠️ 過剰トレード注意
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {isTestMode && (
                <div className="alert-danger" style={{ fontSize: 12, textAlign: "center", padding: "8px", marginTop: 12 }}>
                  テストモード：制限無効
                </div>
              )}
            </BigCard>

            <BigCard style={{ marginTop: 0 }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                <IconHistory />
                <h3 style={{ margin: 0, fontSize: 18 }}>履歴・振り返り</h3>
              </div>
              <div className="text-muted" style={{ marginBottom: 16 }}>
                過去の記録を確認し、冷静に振り返りましょう。
              </div>
              <div style={{ marginTop: "auto" }}>
                <button onClick={() => setMode("history")} style={{ width: "100%" }}>履歴一覧へ</button>
              </div>
            </BigCard>
          </div>

          <Card style={{ marginTop: 0 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>お知らせ</h3>
            {announcements.length === 0 ? (
              <div className="text-muted" style={{ padding: "12px 0" }}>まだありません。</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {announcements.map((a) => (
                  <div key={a.id} style={{ padding: "12px", background: "rgba(0,0,0,0.02)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                    <div className="text-muted" style={{ fontSize: 11, marginBottom: 4 }}>
                      {new Date(a.created_at).toLocaleString()}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{a.title}</div>
                    <div style={{ fontSize: 13, opacity: 0.8 }}>{a.body}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card style={{ marginTop: 0 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>先生からのDM</h3>
            {visibleMessages.length === 0 ? (
              <div className="text-muted" style={{ padding: "12px 0" }}>まだメッセージがありません。</div>
            ) : (
              <div style={{ maxHeight: 240, overflow: "auto", display: "flex", flexDirection: "column", gap: 12, padding: "4px" }}>
                {visibleMessages.map((m) => (
                  <div key={m.id} style={{ 
                    alignSelf: m.sender_user_id === session.user.id ? "flex-end" : "flex-start",
                    maxWidth: "85%",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    background: m.sender_user_id === session.user.id ? "var(--color-accent)" : "rgba(0,0,0,0.04)",
                    color: m.sender_user_id === session.user.id ? "#fff" : "inherit",
                    fontSize: 13,
                    lineHeight: 1.5,
                    border: m.sender_user_id === session.user.id ? "none" : "1px solid var(--color-border)"
                  }}>
                    <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>
                      {new Date(m.created_at).toLocaleString()}
                    </div>
                    <div>{m.body}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <input
                style={{ flex: 1 }}
                placeholder="返信..."
                value={memberDmInput}
                onChange={(e) => setMemberDmInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void sendMemberMessage()}
              />
              <button onClick={() => void sendMemberMessage()} style={{ background: "var(--color-accent)", color: "#fff", border: "none", minWidth: 80 }}>送信</button>
            </div>
          </Card>

          {/* 3. Safety Mat (Bottom) */}
          <Card className="card-accent" style={{ background: "rgba(43, 109, 224, 0.03)", marginTop: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <IconSafety />
              <div>
                <div className="shimmer-text" style={{ fontWeight: 600, fontSize: 15 }}>{copy.banner.user}</div>
                <div className="text-muted" style={{ marginTop: 4 }}>{copy.banner.userSub}</div>
              </div>
            </div>
          </Card>
        </section>
      )}

      {mode === "history" && (
        <section>
          <Card style={{ marginTop: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <IconHistory />
                <h3 style={{ margin: 0 }}>履歴（直近50件）</h3>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => void loadHistory()}>更新</button>
                <button onClick={() => setMode("home")}>戻る</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 400, overflow: "auto", paddingRight: 8 }}>
                {historyLogs.length === 0 ? (
                  <div className="text-muted">まだ記録がありません。</div>
                ) : (
                  historyLogs.map((l) => {
                    const isDone =
                      !!l.completed_at ||
                      (l.success_prob !== null &&
                        l.expected_value !== null &&
                        l.post_gate_kept !== null &&
                        l.post_within_hypothesis !== null);
                    const statusLabel = l.voided_at ? "無効" : isDone ? "完了" : "未完";
                    const active = historyTarget?.id === l.id;
                    return (
                      <button
                        key={l.id}
                        onClick={() => { setHistoryTarget(l); setVoidReason(""); }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "12px 16px",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--color-border)",
                          backgroundColor: active ? "rgba(43, 109, 224, 0.05)" : "var(--color-card)",
                          borderColor: active ? "var(--color-accent)" : "var(--color-border)",
                          transition: "all 0.2s"
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 700 }}>
                          {new Date(l.occurred_at).toLocaleString()}
                        </div>
                        <div className="text-muted" style={{ marginTop: 4, display: "flex", justifyContent: "space-between" }}>
                          <span>{l.log_type}</span>
                          <span style={{ 
                            color: l.voided_at ? "var(--color-danger)" : isDone ? "var(--color-accent)" : "inherit",
                            fontWeight: 600
                          }}>{statusLabel}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div style={{ padding: "0 4px" }}>
                {!historyTarget ? (
                  <div className="text-muted" style={{ textAlign: "center", padding: "40px 0" }}>左の一覧からログを選んでください。</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ paddingBottom: 12, borderBottom: "1px solid var(--color-border)" }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>
                        {new Date(historyTarget.occurred_at).toLocaleString()}
                      </div>
                      <div className="text-muted" style={{ marginTop: 4 }}>種別：{historyTarget.log_type}</div>
                    </div>

                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--color-text-muted)" }}>前提（Gate）</div>
                      <div style={{ fontSize: 13, background: "rgba(0,0,0,0.03)", padding: 12, borderRadius: "var(--radius-sm)" }}>
                        {` 回数:${historyTarget.gate_trade_count_ok ? "○" : "×"} / ` +
                          `RR:${historyTarget.gate_rr_ok ? "○" : "×"} / ` +
                          `リスク:${historyTarget.gate_risk_ok ? "○" : "×"} / ` +
                          `ルール:${historyTarget.gate_rule_ok ? "○" : "×"}`}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--color-text-muted)" }}>仮説：成功確率</div>
                        <div style={{ fontSize: 14 }}>{labelProb(historyTarget.success_prob)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--color-text-muted)" }}>仮説：期待値</div>
                        <div style={{ fontSize: 14 }}>{labelEV(historyTarget.expected_value)}</div>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--color-text-muted)" }}>事後チェック</div>
                      <div style={{ fontSize: 14 }}>
                        {historyTarget.post_gate_kept === null ? "未完" : historyTarget.post_gate_kept ? "✅ 守れた" : "❌ 破った"} /
                        {historyTarget.post_within_hypothesis === null ? "未完" : historyTarget.post_within_hypothesis ? "🎯 想定内" : "❓ 想定外"}
                      </div>
                    </div>

                    {historyTarget.unexpected_reason && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--color-text-muted)" }}>想定外の原因</div>
                        <div style={{ fontSize: 13, fontStyle: "italic", borderLeft: "2px solid var(--color-danger)", paddingLeft: 10 }}>
                          {historyTarget.unexpected_reason}
                        </div>
                      </div>
                    )}

                    {historyTarget.voided_at && (
                      <div className="alert-danger" style={{ fontSize: 12 }}>
                        無効化：{new Date(historyTarget.voided_at).toLocaleString()}<br />
                        理由：{historyTarget.void_reason ?? "—"}
                      </div>
                    )}

                    {!historyTarget.voided_at &&
                      !historyTarget.completed_at &&
                      (historyTarget.success_prob === null ||
                        historyTarget.expected_value === null ||
                        historyTarget.post_gate_kept === null ||
                        historyTarget.post_within_hypothesis === null) && (
                        <div style={{ marginTop: 10 }}>
                          <PrimaryButton
                            style={{ width: "100%" }}
                            onClick={() => {
                              window.history.pushState({}, "", `/complete/${historyTarget.id}`);
                              setMode("complete");
                              void loadCompleteLog(historyTarget.id);
                            }}
                          >
                            この記録を完了する
                          </PrimaryButton>
                        </div>
                      )}

                    {!historyTarget.voided_at && (
                      <div style={{ marginTop: 12, paddingTop: 16, borderTop: "1px dashed var(--color-border)" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--color-text-muted)" }}>訂正（無効化）</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input
                            style={{ flex: 1, padding: "8px 12px" }}
                            placeholder="訂正理由（例：記録ミス）"
                            value={voidReason}
                            onChange={(e) => setVoidReason(e.target.value)}
                          />
                          <button
                            onClick={() => void voidLog()}
                            style={{ whiteSpace: "nowrap", borderColor: "var(--color-danger)", color: "var(--color-danger)" }}
                          >
                            無効化
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </section>
      )}

      {mode === "complete" && (
        <section>
          <Card style={{ marginTop: 0 }}>
            <h3 style={{ marginTop: 0 }}>取引後を完了する（60秒）</h3>
            {!completeLog ? (
              <div style={{ opacity: 0.85 }}>読み込み中…</div>
            ) : (
              <>
                <div style={{ padding: 10, border: "1px solid #444" }}>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>
                    対象：{new Date(completeLog.occurred_at).toLocaleString()} / {completeLog.log_type}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    前提：回数{completeLog.gate_trade_count_ok ? "○" : "×"} / リワード{completeLog.gate_rr_ok ? "○" : "×"} / リスク{completeLog.gate_risk_ok ? "○" : "×"} / ルール{completeLog.gate_rule_ok ? "○" : "×"}
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6 }}>
                    成功確率（感覚でOK）
                  </div>
                  <ChoiceRow>
                    <ChoiceButton active={completeSuccessProb === "high"} onClick={() => setCompleteSuccessProb("high")}>
                      高<br /><span style={{ fontSize: 12, opacity: 0.75 }}>根拠がある</span>
                    </ChoiceButton>
                    <ChoiceButton active={completeSuccessProb === "mid"} onClick={() => setCompleteSuccessProb("mid")}>
                      中<br /><span style={{ fontSize: 12, opacity: 0.75 }}>五分・迷う</span>
                    </ChoiceButton>
                    <ChoiceButton active={completeSuccessProb === "low"} onClick={() => setCompleteSuccessProb("low")}>
                      低<br /><span style={{ fontSize: 12, opacity: 0.75 }}>微妙</span>
                    </ChoiceButton>
                  </ChoiceRow>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6 }}>
                    期待値（有利/不利の感覚）
                  </div>
                  <ChoiceRow>
                    <ChoiceButton active={completeExpectedValue === "plus"} onClick={() => setCompleteExpectedValue("plus")}>
                      ＋<br /><span style={{ fontSize: 12, opacity: 0.75 }}>条件そろってる</span>
                    </ChoiceButton>
                    <ChoiceButton active={completeExpectedValue === "unknown"} onClick={() => setCompleteExpectedValue("unknown")}>
                      不明<br /><span style={{ fontSize: 12, opacity: 0.75 }}>判断つかない</span>
                    </ChoiceButton>
                    <ChoiceButton active={completeExpectedValue === "minus"} onClick={() => setCompleteExpectedValue("minus")}>
                      －<br /><span style={{ fontSize: 12, opacity: 0.75 }}>不利寄り</span>
                    </ChoiceButton>
                  </ChoiceRow>
                </div>

                <div style={{ marginTop: 14 }}>
                  <Row>
                    <label style={{ width: 220 }}>ルールは守れたか</label>
                    <YesNoJP value={completePostGateKept} setValue={setCompletePostGateKept} />
                  </Row>
                  <Row>
                    <label style={{ width: 220 }}>想定内だったか</label>
                    <YesNoJP value={completePostWithinHypo} setValue={setCompletePostWithinHypo} />
                  </Row>
                </div>

                {(completePostGateKept === false || completePostWithinHypo === false) && (
                  <Row>
                    <label style={{ width: 220 }}>想定外の原因（1行）</label>
                    <input
                      style={{ flex: 1, padding: 10 }}
                      maxLength={120}
                      placeholder="例：前提条件の破綻 / ルール未達 / 記録漏れ（事実のみ）"
                      value={completeUnexpectedReason}
                      onChange={(e) => setCompleteUnexpectedReason(e.target.value)}
                    />
                  </Row>
                )}

                <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => void saveCompletion()}>保存して完了</button>
                  <button onClick={() => { window.history.pushState({}, "", "/"); setMode("history"); }}>戻る</button>
                </div>
              </>
            )}
          </Card>
        </section>
      )}

      {mode === "pre" && (
        <section>
          <Card className="card-accent" style={{ marginTop: 0 }}>
            <h3 style={{ marginBottom: 20 }}>{labels.tradePre}</h3>
            
            {memberSettings && !memberSettings.unlocked && weeklyAttempts >= memberSettings.weekly_limit && !isTestMode && (
              <div className="alert-danger" style={{ marginBottom: 20 }}>
                {labels.weeklyLimitReached}
              </div>
            )}

            <div style={{ padding: 16, background: "rgba(0,0,0,0.03)", borderRadius: "var(--radius-md)", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center" }}>
                <IconSafety /> {copy.verdict.title}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 13, opacity: 0.8 }}>{copy.verdict.rr}</div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>{copy.verdict.risk}</div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>{copy.verdict.skip}</div>
              </div>
            </div>

            <div style={{ marginBottom: 24, padding: "0 4px" }}>
              <div className="text-muted" style={{ fontWeight: 700, marginBottom: 4 }}>今週残り</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--color-accent)" }}>
                {Math.max(0, (memberSettings?.weekly_limit ?? 2) - weeklyAttempts)} <span style={{ fontSize: 14, color: "var(--color-text-muted)" }}>/ {memberSettings?.weekly_limit ?? 2} 回</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <section>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <h4 style={{ margin: 0 }}>① {copy.gate.rrTitle}</h4>
                  <button onClick={() => setGateHelp((h) => ({ ...h, rr: !h.rr }))} style={{ padding: "4px 10px", fontSize: 12 }}>？</button>
                </div>
                {gateHelp.rr && (
                  <div className="text-muted" style={{ padding: 12, background: "rgba(0,0,0,0.02)", borderRadius: "var(--radius-sm)", marginBottom: 12 }}>{copy.gate.rrHelp}</div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="text-muted" style={{ display: "block", marginBottom: 6 }}>{copy.gate.takeProfit}</label>
                    <input
                      style={{ width: "100%" }}
                      placeholder="利確金額"
                      value={takeProfitAmount}
                      onChange={(e) => setTakeProfitAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-muted" style={{ display: "block", marginBottom: 6 }}>{copy.gate.stopLoss}</label>
                    <input
                      style={{ width: "100%" }}
                      placeholder="損切り金額"
                      value={stopLossAmount}
                      onChange={(e) => setStopLossAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600 }}>
                  RR：{(() => {
                    const stopLoss = Number(stopLossAmount);
                    const takeProfit = Number(takeProfitAmount);
                    if (stopLoss > 0 && takeProfit > 0) {
                      const rr = takeProfit / stopLoss;
                      const ok = rr >= 3;
                      return <span style={{ color: ok ? "var(--color-accent)" : "var(--color-danger)" }}>{rr.toFixed(2)}（{ok ? "OK" : "NG"}）</span>;
                    }
                    return <span className="text-muted">未計算</span>;
                  })()}
                </div>
              </section>

              <section>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <h4 style={{ margin: 0 }}>② {copy.gate.riskTitle}</h4>
                  <button onClick={() => setGateHelp((h) => ({ ...h, risk: !h.risk }))} style={{ padding: "4px 10px", fontSize: 12 }}>？</button>
                </div>
                {gateHelp.risk && (
                  <div className="text-muted" style={{ padding: 12, background: "rgba(0,0,0,0.02)", borderRadius: "var(--radius-sm)", marginBottom: 12 }}>{copy.gate.riskHelp}</div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="text-muted" style={{ display: "block", marginBottom: 6 }}>{copy.gate.balance}</label>
                    <input
                      style={{ width: "100%" }}
                      placeholder="資金"
                      value={accountBalance}
                      onChange={(e) => setAccountBalance(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-muted" style={{ display: "block", marginBottom: 6 }}>{copy.gate.stopLoss}</label>
                    <input
                      style={{ width: "100%" }}
                      placeholder="損切り金額"
                      value={stopLossAmount}
                      onChange={(e) => setStopLossAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600 }}>
                  リスク：{(() => {
                    const balance = Number(accountBalance);
                    const stopLoss = Number(stopLossAmount);
                    if (balance > 0 && stopLoss > 0) {
                      const riskPct = (stopLoss / balance) * 100;
                      const ok = riskPct <= 2;
                      return <span style={{ color: ok ? "var(--color-accent)" : "var(--color-danger)" }}>{riskPct.toFixed(2)}%（{ok ? "OK" : "NG"}）</span>;
                    }
                    return <span className="text-muted">未計算</span>;
                  })()}
                </div>
              </section>

              <section>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <h4 style={{ margin: 0 }}>③ {copy.gate.ruleTitle}</h4>
                  <button onClick={() => setGateHelp((h) => ({ ...h, rule: !h.rule }))} style={{ padding: "4px 10px", fontSize: 12 }}>？</button>
                </div>
                {gateHelp.rule && (
                  <div className="text-muted" style={{ padding: 12, background: "rgba(0,0,0,0.02)", borderRadius: "var(--radius-sm)", marginBottom: 12 }}>{copy.gate.ruleHelp}</div>
                )}
                <GateRowJP
                  label={copy.gate.ruleLabel}
                  checked={gate.gate_rule_ok}
                  onChange={(v) => setGate((g) => ({ ...g, gate_rule_ok: v }))}
                />
              </section>
            </div>

            <hr style={{ margin: "24px 0", border: "none", borderTop: "1px solid var(--color-border)" }} />

            {gateAllOk ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <h4 style={{ margin: 0 }}>仮説（振り返りのためのラベル付け）</h4>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--color-text-muted)" }}>成功確率</div>
                  <ChoiceRow>
                    <ChoiceButton active={successProb === "high"} onClick={() => setSuccessProb("high")}>
                      高<div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>根拠あり</div>
                    </ChoiceButton>
                    <ChoiceButton active={successProb === "mid"} onClick={() => setSuccessProb("mid")}>
                      中<div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>五分五分</div>
                    </ChoiceButton>
                    <ChoiceButton active={successProb === "low"} onClick={() => setSuccessProb("low")}>
                      低<div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>自信なし</div>
                    </ChoiceButton>
                  </ChoiceRow>
                </div>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--color-text-muted)" }}>期待値</div>
                  <ChoiceRow>
                    <ChoiceButton active={expectedValue === "plus"} onClick={() => setExpectedValue("plus")}>
                      ＋<div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>有利</div>
                    </ChoiceButton>
                    <ChoiceButton active={expectedValue === "unknown"} onClick={() => setExpectedValue("unknown")}>
                      不明<div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>判断不能</div>
                    </ChoiceButton>
                    <ChoiceButton active={expectedValue === "minus"} onClick={() => setExpectedValue("minus")}>
                      －<div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>不利</div>
                    </ChoiceButton>
                  </ChoiceRow>
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                  <PrimaryButton
                    onClick={() => void savePre()}
                    disabled={weeklyLocked && !isTestMode}
                    style={{ flex: 1 }}
                  >
                    {labels.tradePre} を保存
                  </PrimaryButton>
                  <button onClick={() => { resetPre(); setMode("home"); }} style={{ flex: 1 }}>戻る</button>
                </div>
              </div>
            ) : (
              <div>
                <div className="alert-danger" style={{ marginBottom: 20, fontWeight: 600 }}>
                  前提に「いいえ」があります。今日は見送るのが正解です。
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <PrimaryButton onClick={() => void saveSkipQuick()} style={{ flex: 1 }}>見送りとして記録</PrimaryButton>
                  <button onClick={() => { resetPre(); setMode("home"); }} style={{ flex: 1 }}>戻る</button>
                </div>
              </div>
            )}
          </Card>
        </section>
      )}

      {mode === "post" && (
        <section>
          <Card style={{ marginTop: 0 }}>
            <h3 style={{ marginBottom: 20 }}>{labels.tradePost}</h3>

            {!pending ? (
              <>
                <p style={{ opacity: 0.85 }}>未完の記録がありません。先に「取引前」を記録してください。</p>
                <button onClick={() => setMode("home")}>戻る</button>
              </>
            ) : (
              <>
                <div style={{ padding: 10, border: "1px solid #444" }}>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>
                    対象：{new Date(pending.occurred_at).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    仮説：{labelProb(pending.success_prob)} / 期待値：{labelEV(pending.expected_value)}
                  </div>
                </div>

                <hr style={{ margin: "14px 0" }} />

                <h4>事後チェック（感情禁止：事実だけ）</h4>
                <Row>
                  <label style={{ width: 220 }}>ルールは守れたか</label>
                  <YesNoJP value={postGateKept} setValue={setPostGateKept} />
                </Row>
                <Row>
                  <label style={{ width: 220 }}>想定内だったか</label>
                  <YesNoJP value={postWithinHypo} setValue={setPostWithinHypo} />
                </Row>

                {(postGateKept === false || postWithinHypo === false) && (
                  <>
                    <Row>
                      <label style={{ width: 220 }}>想定外の原因（1行）</label>
                      <input
                        style={{ flex: 1, padding: 10 }}
                        maxLength={120}
                        placeholder="例：前提条件の破綻 / ルール未達 / 記録漏れ（事実のみ）"
                        value={unexpectedReason}
                        onChange={(e) => setUnexpectedReason(e.target.value)}
                      />
                    </Row>
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <SmallChip onClick={() => setUnexpectedReason("前提条件の破綻")}>前提条件の破綻</SmallChip>
                      <SmallChip onClick={() => setUnexpectedReason("ルール未達")}>ルール未達</SmallChip>
                      <SmallChip onClick={() => setUnexpectedReason("記録漏れ")}>記録漏れ</SmallChip>
                    </div>
                  </>
                )}

                <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => void savePost()}>保存（取引後）</button>
                  <button onClick={() => { resetPost(); setMode("home"); }}>戻る</button>
                </div>
              </>
            )}
          </Card>
        </section>
      )}

    </div>
  );
}

// --- Icons ---
const IconSafety = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: "middle" }}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconMenu = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const IconClose = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconGear = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: "middle" }}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IconNext = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: "middle" }}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const IconStats = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: "middle" }}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const IconHistory = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: "middle" }}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

function Card(props: { children: any; style?: CSSProperties; className?: string }) {
  return (
    <div
      className={`card ${props.className ?? ""}`}
      style={{
        marginTop: 0,
        ...(props.style ?? {}),
      }}
    >
      {props.children}
    </div>
  );
}

function Row(props: { children: any; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", gap: "var(--space-md)", alignItems: "center", marginTop: "var(--space-md)", flexWrap: "wrap", ...(props.style ?? {}) }}>
      {props.children}
    </div>
  );
}

function GateRowJP(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
        style={{ width: 18, height: 18 }}
      />
      <span style={{ fontWeight: 500 }}>{props.label}</span>
      <span style={{ marginLeft: "auto", opacity: 0.75, fontSize: 12 }}>{props.checked ? "はい" : "いいえ"}</span>
    </label>
  );
}

function YesNoJP(props: { value: boolean | null; setValue: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <button
        onClick={() => props.setValue(true)}
        style={{ 
          padding: "10px 20px", 
          flex: 1,
          borderColor: props.value === true ? "var(--color-accent)" : "var(--color-border)",
          backgroundColor: props.value === true ? "rgba(43, 109, 224, 0.1)" : "var(--color-card)",
          fontWeight: props.value === true ? 700 : 500 
        }}
      >
        はい
      </button>
      <button
        onClick={() => props.setValue(false)}
        style={{ 
          padding: "10px 20px", 
          flex: 1,
          borderColor: props.value === false ? "var(--color-danger)" : "var(--color-border)",
          backgroundColor: props.value === false ? "var(--color-danger-bg)" : "var(--color-card)",
          fontWeight: props.value === false ? 700 : 500 
        }}
      >
        いいえ
      </button>
    </div>
  );
}


function ChoiceRow(props: { children: any }) {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
      {props.children}
    </div>
  );
}

function ChoiceButton(props: { active: boolean; onClick: () => void; children: any }) {
  return (
    <button
      onClick={props.onClick}
      style={{
        padding: "12px 16px",
        minWidth: 100,
        textAlign: "center",
        borderColor: props.active ? "var(--color-accent)" : "var(--color-border)",
        backgroundColor: props.active ? "rgba(43, 109, 224, 0.1)" : "var(--color-card)",
        color: props.active ? "var(--color-accent)" : "var(--color-text)",
        fontWeight: props.active ? 700 : 500,
      }}
    >
      {props.children}
    </button>
  );
}

function SmallChip(props: { onClick: () => void; children: any }) {
  return (
    <button
      onClick={props.onClick}
      style={{
        padding: "6px 12px",
        fontSize: 12,
        borderRadius: "var(--radius-sm)",
        opacity: 0.9,
      }}
    >
      {props.children}
    </button>
  );
}

function BigCard(props: { children: any; className?: string; style?: CSSProperties }) {
  return (
    <div
      className={`card ${props.className ?? ""}`}
      style={{
        padding: "var(--space-lg)",
        minHeight: 180,
        ...(props.style ?? {}),
      }}
    >
      {props.children}
    </div>
  );
}

function PrimaryButton(props: { onClick: () => void; children: any; disabled?: boolean; className?: string; style?: CSSProperties }) {
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      className={props.className}
      style={{
        background: "var(--color-accent)",
        color: "#fff",
        border: "none",
        padding: "14px 28px",
        borderRadius: "var(--radius-md)",
        fontSize: 15,
        fontWeight: 700,
        width: "auto",
        minWidth: 160,
        minHeight: 52,
        boxShadow: "0 4px 12px rgba(43, 109, 224, 0.2)",
        ...(props.style ?? {}),
      }}
    >
      {props.children}
    </button>
  );
}

function NameBadge(props: { name: string; userId?: string | null }) {
  const labelSource = props.name?.trim() || props.userId || "?";
  const initial = labelSource.slice(0, 1).toUpperCase();
  const hueBase = (props.userId ?? labelSource).split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hue = hueBase % 360;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        color: "#fff",
        background: `hsl(${hue} 45% 45%)`,
        marginRight: 6,
      }}
      aria-label={props.name}
      title={props.name}
    >
      {initial}
    </span>
  );
}
