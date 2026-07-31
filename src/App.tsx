import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { labels } from "./ui/labels";
import { copy } from "./ui/copy.ts";
import { StreakHeader } from "./components/streak-header";
import { useTradeStore, type TradeLogLite, type SuccessProb, type ExpectedValue } from "./store/tradeStore";
import { fetchCurrencyPairs, sortPairsForJP, type CurrencyPair } from "./services/currencyPairService";
import { calculateTradeMetrics } from "./utils/lotCalculator";
import { NextActionCard } from "./components/next-action-card";
import { HomeNavigator, type HomeNavigatorMode } from "./components/home-navigator";
import { AdminHeader } from "./components/admin-header";
import { InstallPrompt } from "./components/install-prompt";
import { updateXpAndStreak } from "./lib/xp";
import LectureNotesPage from "./pages/LectureNotesPage";
import HistoryPage from "./pages/HistoryPage";
import { BottomTabBar, type TabKey } from "./components/bottom-tab-bar";
import OnboardingTour from "./components/Onboarding/OnboardingTour";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import AdminLayout from "./layouts/AdminLayout";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import { getJPYRate } from "./services/exchangeRateService";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminBehavior from "./pages/admin/AdminBehavior";
import AdminMessages from "./pages/admin/AdminMessages";
import { InterventionManagementPage } from "./pages/admin/InterventionManagementPage";
import NotificationPrompt from "./components/NotificationPrompt";
import MessageDetail from "./pages/MessageDetail";
import { getEntryPricePlaceholder, getStopLossPricePlaceholder } from "./utils/marketData";
import { PreTradeChecklist } from "./components/PreTradeChecklist";
import MascotOverlay from "./components/Mascot/MascotOverlay";
import { useMascotStore } from "./store/mascotStore";
import { haptics } from "./lib/haptics";
import MyPage from "./pages/MyPage";
import LearningContentsPage from "./pages/LearningContentsPage";
import SlideViewerPage from "./pages/SlideViewerPage";
import VideoListPage from "./pages/VideoListPage";
import ImportPage from "./pages/ImportPage";
import MessagesPage from "./pages/MessagesPage";
import AnalysisPage from "./pages/AnalysisPage";

// Mode型はtradeStoreで管理（ここでの宣言は不要）

type LearningCard = {
  id: number;
  title: string;
  content: string[];
  emoji: string;
};

const learningCards: LearningCard[] = [
  {
    id: 1,
    emoji: "🛡️",
    title: "2%ルール：破産を防ぐ基本",
    content: [
      "1回の取引で失っていい金額は、資金の2%まで。",
      "例：資金10万円なら、1回の損失は2,000円まで。",
      "これを守ると、連敗しても資金が残り、再起できます。",
      "「もっと稼ぎたい」より「生き残る」が先です。",
    ],
  },
  {
    id: 2,
    emoji: "⚖️",
    title: "リスクリワード（RR）1:3の意味",
    content: [
      "損切り1に対して、利確3以上を狙う設定。",
      "例：損切り1,000円なら、利確3,000円以上。",
      "勝率33%でもトントン、それ以上なら利益が残ります。",
      "「当てる」ではなく「損小利大」で勝つのがFXです。",
    ],
  },
  {
    id: 3,
    emoji: "🚦",
    title: "なぜ1日2回までなのか？",
    content: [
      "初心者が破産する最大の原因は「やりすぎ」です。",
      "1日2回の制限で、焦らず・丁寧に・記録を振り返る習慣を作ります。",
      "学習と記録が積み重なると、上限が段階的に解放されます。",
      "「制限」ではなく「守り」のための設計です。",
    ],
  },
  {
    id: 4,
    emoji: "🎯",
    title: "見送りも立派な判断",
    content: [
      "チャンスがない日に無理に取引するのは、ギャンブルです。",
      "ルールを満たさないなら「見送り」を記録してください。",
      "見送りもXPが貯まり、学習継続の評価になります。",
      "「何もしない勇気」が、資金を守ります。",
    ],
  },
  {
    id: 5,
    emoji: "😤",
    title: "感情とルール：取り返したいは危険信号",
    content: [
      "「負けを取り返したい」は破産フラグ。",
      "ルールを破った時こそ、記録を見直して原因を特定します。",
      "このアプリは「感情を冷ます」ためのツールです。",
      "勝ち負けより、ルールを守れたかを評価してください。",
    ],
  },
  {
    id: 6,
    emoji: "🔄",
    title: "記録の振り返りが成長の鍵",
    content: [
      "取引後の記録は「感情禁止、事実だけ」で書きます。",
      "ルールを守れたか？想定内だったか？を冷静に確認。",
      "10回分の記録を見返すと、自分のクセが見えてきます。",
      "「当てる」から「改善する」へ、視点を変えましょう。",
    ],
  },
  {
    id: 7,
    emoji: "⏱️",
    title: "30秒・60秒で記録する意味",
    content: [
      "記録を短時間で終わらせるのは、習慣化のため。",
      "「めんどくさい」と思う前に、サクッと終わる設計。",
      "記録が続けば、振り返りが資産になります。",
      "「完璧な記録」より「続ける記録」を目指してください。",
    ],
  },
  {
    id: 8,
    emoji: "🎓",
    title: "学習と実践の両輪で上達する",
    content: [
      "このアプリは「学び」と「記録」をセットで積み上げます。",
      "週2回の取引で実践し、毎日の学習で知識を固める。",
      "焦って取引回数を増やすより、質を上げるのが先です。",
      "学習が続けば、段階的に機能が解放されます。",
    ],
  },
  {
    id: 9,
    emoji: "📐",
    title: "ポジションサイズの決め方",
    content: [
      "損切り幅から逆算して、ロット数を決めます。",
      "計算式：許容損失 ÷ 損切り幅（円換算）= ロット数",
      "例：許容2,000円、損切り30pips（1ロット3,000円）なら、約0.66ロット。",
      "「なんとなく」でロットを決めると、2%ルールが守れません。",
    ],
  },
  {
    id: 10,
    emoji: "📊",
    title: "期待値とは？（初心者向け）",
    content: [
      "期待値 = 1回の取引で平均して得られる利益。",
      "例：勝率40%、RR 1:3なら、10回で平均プラスになります。",
      "期待値がプラスの手法を、何度も繰り返すのがFXの本質。",
      "「この1回で勝ちたい」ではなく「100回で勝つ」発想が大切です。",
    ],
  },
];

// 今日の学習カードを取得する関数
function getTodayLearningCard(): LearningCard {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const index = dayOfYear % learningCards.length;
  return learningCards[index];
}

// GateState, SuccessProb, ExpectedValue はtradeStoreからimport済み

type LogType = "valid" | "invalid" | "skip";
// TradeLogLite はtradeStoreからimport済み

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

type MemberSettings = {
  member_user_id: string;
  weekly_limit: number;
  max_risk_percent: number;
  unlocked: boolean;
  note: string | null;
};


// initialGateはtradeStoreに移行済み

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

function isToday(d: string | number | Date) {
  const dt = new Date(d);
  const now = new Date();
  return dt.toDateString() === now.toDateString();
}

export default function App() {
  const { showMascot } = useMascotStore();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState("");
  // mode はURLパスで管理（Zustandの mode/setMode は不要）
  const navigate = useNavigate();
  const location = useLocation();
  // activeTab は URL パスから自動判定
  const activeTab: TabKey = (() => {
    if (location.pathname.startsWith("/history")) return "history";
    if (location.pathname.startsWith("/lecture-notes") || location.pathname.startsWith("/lecture")) return "lecture";
    if (location.pathname.startsWith("/messages")) return "messages";
    return "home";
  })();
  const [showMenu, setShowMenu] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const isAdminRoute =
    location.pathname.startsWith("/admin") || location.pathname.startsWith("/staff");
  const isAnalysisRoute = location.pathname === "/analysis";
  const isAdminLogsRoute =
    location.pathname.startsWith("/admin/logs") ||
    location.pathname.startsWith("/staff/logs");
  const isAuthCallback = location.pathname === "/auth/callback";
  const completeLogId =
    !isAdminRoute && location.pathname.startsWith("/complete/")
      ? decodeURIComponent(location.pathname.replace("/complete/", ""))
      : null;
  // login
  const [email, setEmail] = useState("");

  const [role, setRole] = useState<"member" | "teacher" | "admin">("member");
  const isTeacher = role === "teacher" || role === "admin";

  const [testMode, setTestMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("fxj_test_mode") === "1";
  });
  const isTestMode = testMode && isTeacher;

  // pending, activeLog, currentLogId は Zustand ストアで管理
  const {
    pending, setPending,
    activeLog, setActiveLog,
    currentLogId, setCurrentLogId,
  } = useTradeStore();
  // currentLogId は上記で展開済み
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);
  const [level, setLevel] = useState(1);
  const [currentXp, setCurrentXp] = useState(0);
  const [loginStreak, setLoginStreak] = useState(0);
  const [showNameModal, setShowNameModal] = useState(false);

  // XP更新共通ハンドラ
  type XpResult = { level: number; currentXp: number; loginStreak: number };
  const applyXpResult = (res: XpResult | null) => {
    if (!res) return;
    setLevel((prevLevel) => {
      const nextLevel = res.level;
      if (nextLevel > prevLevel) {
        // TODO: レベルアップ演出（モーダルやトースト）をここに追加
        console.log(`Level up! ${prevLevel} -> ${nextLevel}`);
        showMascot("levelUp");
      }
      return nextLevel;
    });
    setLoginStreak((prevStreak) => {
      const nextStreak = res.loginStreak;
      if (nextStreak > prevStreak) {
        showMascot("streakUpdated");
      }
      return nextStreak;
    });
    setCurrentXp(res.currentXp);
  };
  const [nameInput, setNameInput] = useState("");
  const [profileNameMap, setProfileNameMap] = useState<Record<string, string>>({});

  // pre (取引前) - Zustand ストアで管理
  const {
    mode, setMode,
    gate,
    successProb, setSuccessProb,
    expectedValue, setExpectedValue,
    accountBalance, setAccountBalance,
    stopLossAmount,
    takeProfitAmount,
    // Phase 3: 通貨ペア・ピップス入力
    selectedPairSymbol, setSelectedPairSymbol,
    entryRate: currentRate, setEntryRate: setCurrentRate,
    stopLossPrice, setStopLossPrice,
    stopLossPips, setStopLossPips,
    takeProfitPips, setTakeProfitPips,
    riskPercent,
    gateHelp, setGateHelp,
    rememberedPreTradeInputs,
    resetPre,
    note, setNote,
    // 環境認識タグ
    preEnvSign, preEnvTrend4hUp, preEnvRange4h, preEnvSupport15m,
    preEnvLongWick15m, preEnvFlag, preEnvTriangle, preEnvLondon,
    preEnvNewyork, preEnvAsPlanned, setPreEnv
  } = useTradeStore();


  // post (取引後) - Zustand ストアで管理
  const {
    postSide, setPostSide,
    postResult, setPostResult,
    postPl, setPostPl,
    postRrText, setPostRrText,
    postRuleRespected, setPostRuleRespected,
    postInExpectedRange, setPostInExpectedRange,
    postGoodParticipation, setPostGoodParticipation,
    postReferencePoint, setPostReferencePoint,
    postNote: postNoteValue, setPostNote,
    resetPost,
  } = useTradeStore();

  // progress summary
  const [dailyAttempts, setDailyAttempts] = useState(0);

  // Phase 3: 通貨ペア一覧
  const [currencyPairs, setCurrencyPairs] = useState<CurrencyPair[]>([]);
  const selectedPair = useMemo(
    () => currencyPairs.find(p => p.symbol === selectedPairSymbol) ?? null,
    [currencyPairs, selectedPairSymbol]
  );

  // 参考レートと損切り価格は、画面を離れても下書きを復元する
  const [preTradeStep, setPreTradeStep] = useState<1 | 2 | 3>(1);
  const [postTradeStep, setPostTradeStep] = useState<1 | 2>(1);
  const [skipSaving, setSkipSaving] = useState(false);
  const [postSaving, setPostSaving] = useState(false);
  const [pendingSkipSaving, setPendingSkipSaving] = useState(false);

  useEffect(() => {
    const entry = Number(currentRate);
    const slPrice = Number(stopLossPrice);
    if (!currentRate || !stopLossPrice || isNaN(entry) || isNaN(slPrice)) {
      setStopLossPips("");
      return;
    }
    const diff = Math.abs(entry - slPrice);
    let pips = 0;

    if (selectedPairSymbol?.includes('JPY')) {
      pips = Math.round(diff / 0.01);        // 1pip = 0.01
    } else if (selectedPairSymbol?.startsWith('XAU')) {
      pips = Math.round(diff / 0.01);        // 1pip = 0.01
    } else if (selectedPairSymbol?.startsWith('XAG')) {
      pips = Math.round(diff / 0.01);       // 1pip = 0.01
    } else {
      pips = Math.round(diff / 0.0001 * 10) / 10; // 1pip = 0.0001
    }
    setStopLossPips(pips.toString());
  }, [currentRate, stopLossPrice, selectedPairSymbol, setStopLossPips]);

  // Phase 3: 為替レート取得
  const [jpyRate, setJpyRate] = useState<number>(1);
  useEffect(() => {
    const fetchRate = async () => {
      if (selectedPair) {
        const rate = await getJPYRate(selectedPair.quote_currency);
        setJpyRate(rate);
      }
    };
    fetchRate();
  }, [selectedPair]);

  // Phase 3: 推奨RR比（定数）
  const RECOMMENDED_RR = 3.0;

  // Phase 3: 利確pips自動逆算（SL pips × 推奨RR比）
  const autoTakeProfitPips = useMemo(() => {
    const slPips = Number(stopLossPips);
    if (slPips <= 0) return 0;
    return Number((slPips * RECOMMENDED_RR).toFixed(1));
  }, [stopLossPips]);

  // 実際に使うTPpips（ユーザーが手動で上書きした場合はそちらを優先）
  const effectiveTpPips = useMemo(() => {
    const manual = Number(takeProfitPips);
    return manual > 0 ? manual : autoTakeProfitPips;
  }, [takeProfitPips, autoTakeProfitPips]);

  // Phase 3: ロット自動計算
  const tradeMetrics = useMemo(() => {
    if (!selectedPair) return null;
    const balance = Number(accountBalance);
    const slPips = Number(stopLossPips);
    const risk = Number(riskPercent) || 2; // デフォルト2%
    if (balance <= 0 || slPips <= 0) return null;

    const tpPips = effectiveTpPips;
    if (tpPips <= 0) return null;

    return calculateTradeMetrics({
      accountBalance: balance,
      riskPercent: risk,
      stopLossPips: slPips,
      takeProfitPips: tpPips,
      pair: selectedPair,
      jpyRate,
    });
  }, [selectedPair, accountBalance, stopLossPips, effectiveTpPips, riskPercent, jpyRate]);
  const [memberSettings, setMemberSettings] = useState<MemberSettings | null>(null);
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);

  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  useEffect(() => {
    // session が確立し、かつ初回表示でない場合のみ
    if (session && !localStorage.getItem("hasSeenInstallPrompt")) {
      setShowInstallPrompt(true);
      localStorage.setItem("hasSeenInstallPrompt", "true");
    }
  }, [session]);

  useEffect(() => {
    if (!session || isAdminRoute) {
      setOnboardingLoading(false);
      return;
    }
    let cancelled = false;
    setOnboardingLoading(true);
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("user_id", session.user.id)
          .single();
        if (cancelled) return;
        if (!error && data && !data.onboarding_completed) {
          setShowOnboarding(true);
        }
      } finally {
        if (!cancelled) setOnboardingLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // session全体ではなくuser.idのみを依存にしているのは意図的
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, isAdminRoute]);

  useEffect(() => {
    if (session) {
      const key = `fxj-login-xp-done-${session.user.id}-${new Date().toDateString()}`;
      const alreadyDone = window.sessionStorage.getItem(key);
      if (alreadyDone) return;

      void (async () => {
        const result = await updateXpAndStreak("LOGIN");
        if (result) {
          applyXpResult(result);
          window.sessionStorage.setItem(key, "1");
        }
      })();
    }
    // applyXpResultは毎回再定義されるため依存配列に入れると無限ループになる
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

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

  const tradeEntryGatesOk = useMemo(
    () => {
      // tradeMetrics が存在すればpipsベースで判定
      if (tradeMetrics) {
        return tradeMetrics.isRrOk && tradeMetrics.isRiskOk;
      }
      // tradeMetrics がない場合（通貨ペア未選択等）は旧方式にフォールバック
      const balance = Number(accountBalance);
      const stopLoss = Number(stopLossAmount);
      const takeProfit = Number(takeProfitAmount);
      const rr = stopLoss > 0 && takeProfit > 0 ? takeProfit / stopLoss : null;
      const riskPct = balance > 0 && stopLoss > 0 ? (stopLoss / balance) * 100 : null;
      const rrOk = rr !== null && rr >= 2.7;
      const riskOk = riskPct !== null && riskPct <= 2;
      return rrOk && riskOk;
    },
    [tradeMetrics, accountBalance, stopLossAmount, takeProfitAmount]
  );
  const gateAllOk = tradeEntryGatesOk && gateHelp.rule;
  const dailyLimit = memberSettings?.weekly_limit ?? 2;
  const dailyLocked = !memberSettings?.unlocked && dailyAttempts >= dailyLimit && !isTestMode;
  const isFocusedRecordingRoute = ["/pre-trade", "/post-trade", "/skip"].includes(location.pathname);
  const rememberedBalanceUpdatedAt = rememberedPreTradeInputs[mode].accountBalanceUpdatedAt;
  const rememberedBalanceAgeDays = rememberedBalanceUpdatedAt
    ? Math.floor((Date.now() - new Date(rememberedBalanceUpdatedAt).getTime()) / 86_400_000)
    : null;

  // 今日のログを導出（フックは早期リターンの前に配置）
  const todayLogs = useMemo(
    () => historyLogs.filter((l) => isToday(l.occurred_at)),
    [historyLogs]
  );

  // 今日の取引が完了しているか（completed_at がある）
  const hasCompletedTradeToday = useMemo(
    () => todayLogs.some((l) => l.log_type === "valid" && l.completed_at != null),
    [todayLogs]
  );

  // 今日の見送りがあるか
  const hasSkipToday = useMemo(
    () => todayLogs.some((l) => l.log_type === "skip"),
    [todayLogs]
  );

  // --- Loading Trigger ---
  useEffect(() => {
    if ((isAuthCallback && !session) || (session && !isAdminRoute && onboardingLoading)) {
      showMascot("loading");
    } else {
      if (useMascotStore.getState().currentEvent === "loading") {
        useMascotStore.getState().hideMascot();
      }
    }
  }, [isAuthCallback, session, isAdminRoute, onboardingLoading, showMascot]);

  // --- Auth bootstrap ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription: sub },
    } = supabase.auth.onAuthStateChange((event, s) => {
      console.log("Auth state changed:", event, s?.user?.id); // デバッグログ
      setSession(s);

      // OAuthコールバック後の処理
      if (event === "SIGNED_IN" && window.location.pathname === "/auth/callback") {
        console.log("OAuth callback completed, redirecting to home");
        window.history.replaceState({}, "", "/");
      }
      if (event === "SIGNED_IN" && s?.user) {
        showMascot("login");
      }
    });

    return () => {
      sub.unsubscribe();
    };
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

    // completeLogId からログを取得して pending にセット
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("trade_logs")
          .select("*")
          .eq("id", completeLogId)
          .single();

        if (error) throw error;
        if (!data) return;

        // pending にセット（取引前情報がすでに入っているログ）
        setPending({
          id: data.id,
          occurred_at: data.occurred_at,
          log_type: data.log_type,
          gate_all_ok: data.gate_trade_count_ok && data.gate_rr_ok && data.gate_risk_ok && data.gate_rule_ok,
          success_prob: data.success_prob,
          expected_value: data.expected_value,
          currency_pair_symbol: data.currency_pair_symbol,
          account_balance: data.account_balance,
          stop_loss_pips: data.stop_loss_pips,
          take_profit_pips: data.take_profit_pips,
          calculated_lot: data.calculated_lot,
          risk_percent: data.risk_percent,
          risk_reward_ratio: data.risk_reward_ratio,
          note: data.note,
          post_gate_kept: data.post_gate_kept,
          post_within_hypothesis: data.post_within_hypothesis,
          unexpected_reason: data.unexpected_reason,
          voided_at: data.voided_at,
          completed_at: data.completed_at,
        });

        navigate("/post-trade"); // post モードに切り替え
      } catch (err) {
        console.error("completeLog fetch error:", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, completeLogId]);

  useEffect(() => {
    if (!session) return;
    void loadMyRole();
    void loadDailyCount();
    void loadMemberSettings();
    void loadHistory();
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

  // --- load history when entering history mode ---
  useEffect(() => {
    if (!session || activeTab !== "history") return;
    void loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, activeTab]);

  // Phase 3: 通貨ペア一覧を取得
  useEffect(() => {
    if (!session) return;
    fetchCurrencyPairs().then((pairs) => {
      setCurrencyPairs(sortPairsForJP(pairs));
    });
  }, [session?.user?.id]);

  const sendMagicLink = async () => {
    setStatus("");
    const e = email.trim();
    if (!e) return setStatus("メールを入力してください。");

    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: {
        emailRedirectTo: window.location.origin,
        // New MVP members join through Discord until custom SMTP is enabled.
        // Keep email OTP available for the existing email-linked accounts only.
        shouldCreateUser: false,
      },
    });

    if (error) {
      if (error.status === 429 || error.message.includes("rate limit")) {
        setStatus("メール送信が混み合っています。時間を置くか、Discordログインをご利用ください。");
      } else if (error.message.toLowerCase().includes("signups not allowed")) {
        setStatus("このメールは未登録です。新規利用はDiscordからログインしてください。");
      } else {
        setStatus("メールログインに失敗しました。Discordログインをお試しください。");
      }
    } else {
      setStatus("マジックリンクを送信しました。メールのリンクを踏んでください。");
    }
  };

  const handleDiscordLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        console.error("Discord login error:", error.message);
        setStatus("Discordログインに失敗しました: " + error.message);
      }
    } catch (err) {
      console.error("Unexpected error during Discord login:", err);
    }
  };

  // Zustandのリセットアクションを取得
  const { resetAll: resetTradeStore } = useTradeStore();

  const signOut = async () => {
    showMascot("logout");
    await supabase.auth.signOut();
    // Zustandの取引関連状態を一括リセット
    resetTradeStore();
    // ローカルuseStateのリセット
    setDailyAttempts(0);
    setHistoryLogs([]);
    setRole("member");
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
        "id, occurred_at, log_type, gate_all_ok, success_prob, expected_value, currency_pair_symbol, account_balance, stop_loss_pips, take_profit_pips, calculated_lot, risk_percent, risk_reward_ratio, note, post_gate_kept, post_within_hypothesis, unexpected_reason, voided_at, completed_at"
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

  const loadDailyCount = async () => {
    setStatus("");
    if (!session?.user?.id) return;

    // 今日の0時（JST）をISO文字列で生成
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayIso = todayMidnight.toISOString();

    const { count, error } = await supabase
      .from("trade_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .neq("log_type", "skip")      // 見送りはカウント対象外
      .gte("occurred_at", todayIso);

    if (error) {
      return reportError("日次進捗取得失敗", error);
    }
    setDailyAttempts(count ?? 0);
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
      .select("role, display_name, level, current_xp, login_streak")
      .eq("user_id", session.user.id)
      .single();

    if (!error && data) {
      if (data.role) setRole(data.role);
      setLevel(data.level || 1);
      setCurrentXp(data.current_xp || 0);
      setLoginStreak(data.login_streak || 0);
    }
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
    type ProfileRow = { user_id: string; display_name: string };
    const next: Record<string, string> = {};
    (data ?? []).forEach((p: ProfileRow) => {
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

  // resetPre, resetPost は Zustand ストアから取得済み

  const saveSkipQuick = async () => {
    if (skipSaving) return false;
    setStatus("");
    if (!session?.user?.id) {
      setStatus("未ログインです。");
      return false;
    }
    setSkipSaving(true);

    const skipGate = {
      gate_trade_count_ok: false,
      gate_rr_ok: false,
      gate_risk_ok: false,
      gate_rule_ok: false,
    };

    try {
      const { error } = await supabase.from("trade_logs").insert([
        { user_id: session.user.id, log_type: "skip", ...skipGate },
      ]);

      if (error) {
        setStatus(`見送りの保存に失敗しました: ${error.message}`);
        return false;
      }

      showMascot("sessionEnd");
      haptics.success();

      void (async () => {
        const xpRes = await updateXpAndStreak("DAILY_LESSON_SKIP");
        applyXpResult(xpRes);
      })();

      await Promise.all([loadDailyCount(), loadHistory()]);
      setStatus("✅ 見送りとして記録しました。落ち着いて見送れたことも大切な記録です。");
      navigate("/");
      return true;
    } finally {
      setSkipSaving(false);
    }
  };

  const convertPendingToSkip = async () => {
    if (pendingSkipSaving) return false;
    const targetId = pending?.id ?? activeLog?.id ?? currentLogId;
    if (!session?.user?.id || !targetId) {
      setStatus("見送りへ変更する取引前記録が見つかりません。");
      return false;
    }

    setPendingSkipSaving(true);
    setStatus("");
    try {
      const { data, error } = await supabase
        .from("trade_logs")
        .update({
          log_type: "skip",
          completed_at: new Date().toISOString(),
        })
        .eq("id", targetId)
        .eq("user_id", session.user.id)
        .is("completed_at", null)
        .select("id")
        .maybeSingle();

      if (error || !data) {
        setStatus(`見送りへの変更に失敗しました: ${error?.message ?? "対象の記録を更新できませんでした"}`);
        return false;
      }

      setPending(null);
      setActiveLog(null);
      setCurrentLogId(null);
      showMascot("sessionEnd");
      haptics.success();
      await Promise.all([loadDailyCount(), loadHistory()]);
      setStatus("✅ 取引しなかった判断を見送りとして記録しました。");
      return true;
    } finally {
      setPendingSkipSaving(false);
    }
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      await loadDailyCount();
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
      {
        thread_id: threadId,
        sender_user_id: session.user.id,
        recipient_user_id: row.user_id, // 生徒宛
        body
      },
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
    if (dailyLocked && !isTestMode) {
      return setStatus(labels.weeklyLimitReached);
    }

    const balance = Number(accountBalance);
    const stopLoss = Number(stopLossAmount);
    const takeProfit = Number(takeProfitAmount);
    const slPips = Number(stopLossPips);

    // pipsベースの判定（tradeMetricsがあればそちらを優先）
    let rrOk: boolean;
    let riskOk: boolean;
    let rr: number | null;
    let riskPct: number | null;

    if (tradeMetrics) {
      rrOk = tradeMetrics.isRrOk;
      riskOk = tradeMetrics.isRiskOk;
      rr = tradeMetrics.riskRewardRatio;
      riskPct = balance > 0 ? (tradeMetrics.riskAmount / balance) * 100 : null;
    } else {
      // フォールバック（旧方式）
      rr = stopLoss > 0 && takeProfit > 0 ? takeProfit / stopLoss : null;
      riskPct = balance > 0 && stopLoss > 0 ? (stopLoss / balance) * 100 : null;
      rrOk = rr !== null && rr >= 2.7;
      riskOk = riskPct !== null && riskPct <= 2;
    }

    // Gateが全部Noじゃないか等の判定はUIで見せる
    // Gate 4（Rule OK）は明示入力を保存値に反映する
    const ruleOk = gateHelp.rule;

    if (!rrOk || !riskOk) {
      return setStatus(copy.gate.verdictBlocked);
    }
    if (!ruleOk) {
      return setStatus("ルール確認を完了してください。");
    }
    if (!note.trim()) {
      return setStatus("仮説メモ（根拠）を入力してください。");
    }

    const payload = {
      user_id: session.user.id,
      trade_datetime: new Date().toISOString(),
      log_type: "valid" as const,
      mode: mode,
      ...gate,
      gate_trade_count_ok: true,
      gate_rr_ok: rrOk,
      gate_risk_ok: riskOk,
      gate_rule_ok: ruleOk,
      success_prob: successProb,
      expected_value: expectedValue,
      note: note.trim(), // メモ保存
      pre_note: note.trim(), // 新仕様のフィールド

      // 環境認識タグ（10個）
      pre_env_sign: preEnvSign,
      pre_env_trend4h_up: preEnvTrend4hUp,
      pre_env_range4h: preEnvRange4h,
      pre_env_support15m: preEnvSupport15m,
      pre_env_long_wick15m: preEnvLongWick15m,
      pre_env_flag: preEnvFlag,
      pre_env_triangle: preEnvTriangle,
      pre_env_london: preEnvLondon,
      pre_env_newyork: preEnvNewyork,
      pre_env_as_planned: preEnvAsPlanned,

      // Phase 3: 通貨ペア・自動計算データ
      currency_pair_id: selectedPair?.id ?? null,
      currency_pair_symbol: selectedPairSymbol || null,
      account_balance: balance > 0 ? balance : null,
      stop_loss_pips: slPips > 0 ? slPips : null,
      take_profit_pips: effectiveTpPips > 0 ? effectiveTpPips : null,
      stop_loss_amount: tradeMetrics?.riskAmount ?? (stopLoss > 0 ? stopLoss : null),
      take_profit_amount: tradeMetrics?.takeProfitAmount ?? (takeProfit > 0 ? takeProfit : null),
      calculated_lot: tradeMetrics?.lotSize ?? null,
      risk_percent: riskPct,
      risk_reward_ratio: rr,
    };
    const { data, error } = await supabase
      .from("trade_logs")
      .insert([payload])
      .select(
        "id, occurred_at, log_type, gate_all_ok, success_prob, expected_value, currency_pair_symbol, account_balance, stop_loss_pips, take_profit_pips, calculated_lot, risk_percent, risk_reward_ratio, note, post_side, post_result, post_pl, post_rr_text, post_rule_respected, post_in_expected_range, post_good_participation, post_reference_point, post_note, voided_at, completed_at"
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
      currency_pair_symbol: data.currency_pair_symbol ?? selectedPairSymbol ?? null,
      account_balance: data.account_balance ?? (balance > 0 ? balance : null),
      stop_loss_pips: data.stop_loss_pips ?? (slPips > 0 ? slPips : null),
      take_profit_pips: data.take_profit_pips ?? (effectiveTpPips > 0 ? effectiveTpPips : null),
      calculated_lot: data.calculated_lot ?? tradeMetrics?.lotSize ?? null,
      risk_percent: data.risk_percent ?? riskPct,
      risk_reward_ratio: data.risk_reward_ratio ?? rr,
      note: data.note ?? note.trim(),
      post_side: data.post_side ?? null,
      post_result: data.post_result ?? null,
      post_pl: data.post_pl ?? null,
      post_rr_text: data.post_rr_text ?? null,
      post_rule_respected: data.post_rule_respected ?? null,
      post_in_expected_range: data.post_in_expected_range ?? null,
      post_good_participation: data.post_good_participation ?? null,
      post_reference_point: data.post_reference_point ?? null,
      post_note: data.post_note ?? null,
      voided_at: data.voided_at ?? null,
      completed_at: data.completed_at ?? null,
    };

    setActiveLog(newLog);
    setCurrentLogId(newLog.id);
    setPending(newLog);
    showMascot("tradeSaved");
    haptics.success();

    // XP更新
    void (async () => {
      const xpRes = await updateXpAndStreak("TRADE_PRE");
      applyXpResult(xpRes);
    })();

    resetPre();
    setCurrentRate("");
    setStopLossPrice("");
    setPreTradeStep(1);
    await Promise.all([loadDailyCount(), loadHistory(), loadMemberSettings()]);
    setStatus("✅ 取引前の記録を保存しました。取引が終わったらホームから結果を記録できます。");
    navigate("/");
  };

  // ----------------------
  // 保存：取引後
  // ----------------------
  const savePost = async () => {
    if (postSaving) return false;
    setStatus("");
    const target = pending ?? activeLog;
    const targetId = target?.id ?? currentLogId;
    if (!targetId) {
      setStatus("未完の記録がありません（取引前を先に記録してください）。");
      return false;
    }

    if (postSide === null || postResult === null) {
      setStatus("売買方向と結果を選んでください。");
      setPostTradeStep(1);
      return false;
    }
    if (postRuleRespected === null || postInExpectedRange === null || postGoodParticipation === null) {
      setStatus("チェック項目をすべて選んでください。");
      setPostTradeStep(2);
      return false;
    }

    setPostSaving(true);
    try {
      const { data, error } = await supabase
        .from("trade_logs")
        .update({
          post_side: postSide,
          post_result: postResult,
          post_pl: postPl ? Number(postPl) : null,
          post_rr_text: postRrText.trim() || null,
          post_rule_respected: postRuleRespected,
          post_in_expected_range: postInExpectedRange,
          post_good_participation: postGoodParticipation,
          post_reference_point: postReferencePoint.trim() || null,
          post_note: postNoteValue.trim() || null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", targetId)
        .eq("user_id", session?.user?.id ?? "")
        .is("completed_at", null)
        .select("id")
        .maybeSingle();

      if (error || !data) {
        reportError("取引後記録の保存に失敗", error ?? { message: "対象の記録を更新できませんでした" });
        return false;
      }

      showMascot("sessionEnd");
      haptics.success();
      resetPost();
      setPostTradeStep(1);
      setPending(null);
      setActiveLog(null);
      setCurrentLogId(null);
      await Promise.all([loadDailyCount(), loadHistory()]);
      setStatus("✅ 取引後の事実を記録しました。本日の記録は完了です。");

      void (async () => {
        const xpRes = await updateXpAndStreak("TRADE_POST");
        applyXpResult(xpRes);
      })();

      if (completeLogId) {
        window.history.pushState({}, "", "/");
      }
      navigate("/");
      return true;
    } finally {
      setPostSaving(false);
    }
  };

  // ----------------------
  // UI
  // ----------------------
  // React Router: /admin 配下は AdminLayout + 子ルート
  if (
    window.location.pathname === "/admin" ||
    window.location.pathname.startsWith("/admin/")
  ) {
    return (
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="behavior" element={<AdminBehavior />} />
          <Route path="messages" element={<AdminMessages />} />

          <Route path="interventions" element={<InterventionManagementPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
      </Routes>
    );
  }

  if (isAuthCallback && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="aurora-bg">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
        </div>
        <div className="text-center glass-panel p-8 rounded-3xl relative z-10">
          <MascotOverlay />
          <p className="text-zinc-600 font-medium">認証中...</p>
        </div>
      </div>
    );
  }

  if (!session && !isAuthCallback) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-zinc-50 px-4">
        <div className="w-full max-w-md space-y-6">
          {/* ヘッダー */}
          <div className="text-center">
            <h1 className="text-3xl font-black shimmer-text">FX Journal MVP</h1>
            <p className="mt-2 text-sm text-zinc-600">初心者モード</p>
          </div>

          {/* ログインカード */}
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-zinc-900">ログイン</h2>

            {/* Discordログイン（推奨） */}
            <button
              type="button"
              onClick={handleDiscordLogin}
              className="btn-discord w-full rounded-xl px-4 py-3 font-semibold shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              Discordでログイン（推奨）
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-zinc-500">または</span>
              </div>
            </div>

            {/* 登録済みメールアドレスでのログイン */}
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">
                登録済みメールをお持ちの方のみ。新規利用はDiscordからログインしてください。
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="メールアドレス"
                className="w-full rounded-xl border-2 border-zinc-200 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void sendMagicLink()}
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 transition-colors"
              >
                メールアドレスでログイン
              </button>
            </div>

            {status && (
              <p className="text-sm text-blue-600 font-semibold text-center">
                {status}
              </p>
            )}

            <p className="text-xs text-zinc-500 text-center">
              ログインすると、
              <a href="#" className="underline">
                利用規約
              </a>
              と
              <a href="#" className="underline">
                プライバシーポリシー
              </a>
              に同意したことになります。
            </p>
          </div>
        </div>
      </div>
    );
  }


  if (location.pathname.startsWith("/messages/")) {
    return (
      <Routes>
        <Route path="/messages/:type/:id" element={<MessageDetail />} />
      </Routes>
    );
  }



  if (isAdminRoute && !isTeacher) {
    return (
      <div style={{ maxWidth: "100%", margin: "0", padding: "0 var(--space-md)" }}>
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
      <div className="w-full px-4 pb-8">
        <div className="mb-6">
          <AdminHeader
            title={labels.adminTitle}
            staffName={profileDisplayName ?? session?.user?.email ?? ""}
            logsLabel={labels.adminLogs ?? "ログ閲覧"}
            showMenu={showAdminMenu}
            onToggleMenu={() => setShowAdminMenu((prev) => !prev)}
            onCloseMenu={() => setShowAdminMenu(false)}
            onGoTeacherHome={() => {
              window.location.href = "/admin";
            }}
            onGoLogs={() => {
              window.location.href = "/admin/logs";
            }}
            onGoUserView={() => {
              window.location.href = "/";
            }}
            onGoInterventions={() => {
              window.location.href = "/admin/interventions";
            }}
            onLogout={signOut}
          />
        </div>

        {status && (
          <div data-testid="status-message" style={{ margin: "12px 0", padding: 10, border: "1px solid #333" }}>{status}</div>
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
          <div className="md:flex md:gap-4">
            {/* 左：一覧（md以上で常時表示、md未満は未選択時のみ表示） */}
            <div className={`${adminSelectedLog ? "hidden md:block" : "block"} md:w-[360px] md:flex-shrink-0`}>
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <IconHistory />
                  <h3 className="m-0 text-base font-bold">{labels.adminLogs}</h3>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <input
                    className="flex-1 min-w-[200px] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                    placeholder="ID / Email / 名前..."
                    value={filterMemberQuery}
                    onChange={(e) => setFilterMemberQuery(e.target.value)}
                  />
                  <select className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm" value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value as "7" | "30" | "all")}>
                    <option value="7">直近7日</option>
                    <option value="30">直近30日</option>
                    <option value="all">全期間</option>
                  </select>
                  <select className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm" value={filterLogType} onChange={(e) => setFilterLogType(e.target.value as "all" | LogType)}>
                    <option value="all">全種別</option>
                    <option value="valid">valid</option>
                    <option value="skip">skip</option>
                    <option value="invalid">invalid</option>
                  </select>
                  <select className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm" value={filterReview} onChange={(e) => setFilterReview(e.target.value as "all" | "ok" | "warn" | "inspect" | "none")}>
                    <option value="all">レビュー全て</option>
                    <option value="none">未レビュー</option>
                    <option value="ok">ok</option>
                    <option value="warn">warn</option>
                    <option value="inspect">inspect</option>
                  </select>
                  <PrimaryButton onClick={() => void loadAdminLogs()} style={{ minWidth: 100, padding: "10px 20px" }}>検索</PrimaryButton>
                </div>
                <div className="max-h-[400px] overflow-auto flex flex-col gap-2">
                  {adminLogs.length === 0 ? (
                    <div className="text-muted text-center py-10">ログがありません。</div>
                  ) : (
                    adminLogs.map((l) => {
                      const selectedId = adminSelectedLog ? ("log_id" in adminSelectedLog ? adminSelectedLog.log_id : adminSelectedLog.id) : null;
                      const active = selectedId === l.id;
                      const isComplete = l.post_gate_kept !== null;
                      return (
                        <button
                          key={l.id}
                          onClick={() => {
                            setAdminSelectedLog(l);
                            setAdminNoteInput(l.teacher_note ?? "");
                            if (l.user_id) void loadAdminSettings(l.user_id);
                          }}
                          className={`w-full text-left p-4 rounded-2xl border shadow-sm flex items-center gap-3 transition-colors ${active
                            ? "border-blue-500 bg-blue-50"
                            : "border-zinc-200 bg-white hover:bg-zinc-50"
                            }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <NameBadge
                                name={displayNameFor(l.user_id, l.display_name, l.member_id, l.email)}
                                userId={l.user_id}
                              />
                              <span className="font-bold truncate">{displayNameFor(l.user_id, l.display_name, l.member_id, l.email)}</span>
                            </div>
                            <div className="mt-1 text-xs text-zinc-500">
                              {new Date(l.occurred_at).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${isComplete
                              ? "bg-blue-50 text-blue-700 ring-blue-200"
                              : "bg-zinc-50 text-zinc-700 ring-zinc-200"
                              }`}>
                              {isComplete ? "完了" : "未完"}
                            </span>
                            <span className="text-zinc-400">→</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>

            {/* 右：詳細（md以上で常時表示、md未満は選択時のみ表示） */}
            <div className={`${adminSelectedLog ? "block" : "hidden"} md:block md:flex-1`}>
              {/* モバイル用：戻るボタン */}
              <div className="mb-3 md:hidden">
                <button
                  type="button"
                  onClick={() => setAdminSelectedLog(null)}
                  className="inline-flex items-center rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
                >
                  ← 一覧に戻る
                </button>
              </div>

              <Card className="card-accent">
                <h3 style={{ marginBottom: 20 }}>詳細パネル</h3>
                {!adminSelectedLog ? (
                  <div className="text-muted text-center py-10">左の一覧からログを選んでください。</div>
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
                <Card className="mt-4">
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
          </div>
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
                    data-testid="risk-queue-toggle"
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
                <div data-testid="risk-queue" style={{ marginTop: 12 }}>
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
                            data-testid="risk-queue-row"
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

        {/* 詳細パネル：ダッシュボード（!isAdminLogsRoute）のときのみ表示 */}
        {!isAdminLogsRoute && (
          <>
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
          </>
        )}
      </div>
    );
  }

  if (session && !isAdminRoute && onboardingLoading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-zinc-50">
        <MascotOverlay />
        <p className="text-zinc-600 font-medium">読み込み中...</p>
      </div>
    );
  }

  const nextAction = (() => {
    // 1. 日次制限（最優先）
    if (dailyLocked) {
      return {
        actionLabel: "今日の学びを見る",
        description: `本日の取引は上限に達しました。見送りページで今日の学習カードを確認しましょう。次の取引は明日です。`,
        onAction: () => navigate("/skip"),
        disabled: false,
      };
    }

    // 2. 取引後の入力待ち
    if (pending) {
      return {
        actionLabel: "取引が終わったので記録する",
        description: "取引前の記録を保存済みです。取引が終わったら、結果とルール遵守を記録してください。",
        onAction: () => navigate("/post-trade"),
        secondaryAction: {
          label: pendingSkipSaving ? "見送りへ変更中..." : "今回は取引しなかった",
          onAction: () => void convertPendingToSkip(),
        },
      };
    }

    // 3. 今日のタスクが完了（見送り済み or 取引完了）
    if (hasSkipToday || hasCompletedTradeToday) {
      return {
        actionLabel: "本日のタスク完了",
        description: "今日の振り返りは終了です。お疲れ様でした！",
        onAction: () => { },
        disabled: true,
      };
    }

    // 4. まだ何もしていない場合（取引前 または 見送り）
    return {
      actionLabel: labels.tradePre + " を記録",
      description: "取引チャンスを待機中。見送る場合は「見送り」ボタンから。",
      onAction: () => navigate("/pre-trade"),
      secondaryAction: {
        label: "見送りを記録する（+5 XP）",
        onAction: () => navigate("/skip"),
      },
    };
  })();

  const homeNavigatorMode: HomeNavigatorMode = dailyLocked
    ? "locked"
    : pending
      ? "pending"
      : hasSkipToday || hasCompletedTradeToday
        ? "completed"
        : "normal";

  return (
    <div
      style={{
        maxWidth: "100%",
        margin: "0",
        paddingTop: session && !isAdminRoute && !isFocusedRecordingRoute ? "72px" : "16px",
        paddingRight: location.pathname.startsWith("/learning/slides") ? "0" : "16px",
        paddingBottom: session && !isAdminRoute && !isFocusedRecordingRoute ? "100px" : "32px",
        paddingLeft: location.pathname.startsWith("/learning/slides") ? "0" : "16px",
        minHeight: "100dvh",
      }}
    >
      <MascotOverlay />
      {showOnboarding && session && !isAdminRoute && (
        <OnboardingTour
          session={session}
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      )}
      {/* Aurora Background */}
      {session && !isAdminRoute && (
        <div className="aurora-bg">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
        </div>
      )}

      {/* 記録中は入力に集中できるよう、グローバルナビゲーションを外す */}
      {!isFocusedRecordingRoute && (
        <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          marginBottom: "var(--space-lg)",
          position: session && !isAdminRoute ? "fixed" : "static",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
        }}
        className={session && !isAdminRoute ? "glass-header" : "border-b border-[var(--color-border)] bg-[var(--color-bg)]"}
      >
        <div onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          <h2
            className="shimmer-text"
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 900,
              borderWidth: "0px",
              borderStyle: "none",
              borderColor: "rgba(0, 0, 0, 0)",
              borderImage: "none",
            }}
          >
            {labels.appTitle}
          </h2>
          <div className="text-muted" style={{ fontSize: 13 }}>
            {profileDisplayName ?? session?.user?.email}
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
              overflow: "hidden",
              // メニュー内のみ文字色を黒系に上書き（グローバルCSSの button { color: var(--color-text) } 対策）
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ["--color-text" as any]: "#111827",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ["--color-text-muted" as any]: "#6B7280",
              color: "var(--color-text)"
            }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <button
                  onClick={() => { navigate("/"); setStatus(""); setShowMenu(false); }}
                  style={{ width: "100%", border: "none", borderRadius: 0, display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-start", padding: "16px 20px" }}
                >
                  <IconNext /> ホーム
                </button>
                <button
                  onClick={() => { navigate("/history"); setShowMenu(false); }}
                  style={{ width: "100%", border: "none", borderRadius: 0, display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-start", padding: "16px 20px" }}
                >
                  <IconHistory /> 履歴
                </button>
                <button
                  onClick={() => { navigate("/analysis"); setShowMenu(false); }}
                  style={{ width: "100%", border: "none", borderRadius: 0, display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-start", padding: "16px 20px" }}
                >
                  <span aria-hidden style={{ fontSize: 18 }}>📊</span> 分析（PC）
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    navigate("/lecture-notes");
                  }}
                  style={{ width: "100%", border: "none", borderRadius: 0, display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-start", padding: "16px 20px" }}
                >
                  <span style={{ fontSize: 18 }}>📝</span> 講義メモ
                </button>
                {isTeacher && (
                  <button
                    onClick={() => { window.location.href = "/admin"; }}
                    style={{ width: "100%", border: "none", borderRadius: 0, display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-start", padding: "16px 20px" }}
                  >
                    <IconGear /> 管理
                  </button>
                )}
                {isTeacher && (
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
                )}
                <div style={{ height: "1px", background: "var(--color-border)" }} />
                <button
                  onClick={signOut}
                  style={{ width: "100%", border: "none", borderRadius: 0, display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-start", padding: "16px 20px", color: "var(--color-danger)" }}
                >
                  ログアウト
                </button>
              </div>
            </div>
          )}
        </div>
        </header>
      )}

      {status && (
        <div
          data-testid="status-message"
          role="status"
          className={status.startsWith("✅")
            ? "mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
            : "alert-danger"}
          style={{ marginBottom: "var(--space-lg)" }}
        >
          {status}
        </div>
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

      {activeTab === "home" && location.pathname === "/" && (
        <section>
          <main className="py-3">
            <div className="mx-auto max-w-md space-y-3 text-left">
              <header className="space-y-2">
                <p className="m-0 text-sm text-slate-500">トレード記録 & 振り返り</p>
                <StreakHeader
                  streakDays={loginStreak}
                  level={level}
                  currentXP={currentXp % 100}
                  nextLevelXP={100}
                  onClick={() => navigate("/mypage")}
                />
              </header>

              {isTestMode && (
                <div className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
                  テストモード：制限無効
                </div>
              )}

              <NextActionCard
                actionLabel={nextAction.actionLabel}
                onAction={nextAction.onAction}
                description={nextAction.description}
                disabled={nextAction.disabled}
                secondaryAction={nextAction.secondaryAction}
              />
              <HomeNavigator
                key={homeNavigatorMode}
                mode={homeNavigatorMode}
                onOpenLearning={() => navigate("/learning-contents")}
              />
            </div>
          </main>
        </section>
      )}

      {activeTab === "messages" && session && (
        <MessagesPage userId={session.user.id} />
      )}

      {activeTab === "history" && (
        <HistoryPage session={session} />
      )}

      {activeTab === "lecture" && (
        <LectureNotesPage
          session={session}
          onBack={() => navigate("/")}
          onLectureComplete={(res: unknown) => {
            applyXpResult(res as XpResult | null);
            showMascot("lessonComplete");
          }}
        />
      )}

      {session && !isAdminRoute && !isAnalysisRoute && showInstallPrompt && (
        <InstallPrompt onClose={() => setShowInstallPrompt(false)} />
      )}

      {location.pathname === "/skip" && (
        <section className="space-y-4 max-w-md mx-auto relative pb-4" data-testid="skip-flow">
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => navigate("/")}
              className="min-h-11 rounded-lg px-2 text-sm font-semibold text-zinc-600 flex items-center gap-1 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              ← 戻る
            </button>
            <div className="text-center">
              <h3 className="text-lg font-bold m-0">見送り記録</h3>
              <p className="m-0 text-xs text-zinc-500">目安15秒</p>
            </div>
            <div className="min-w-16" aria-hidden />
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h4 className="m-0 text-lg font-bold text-zinc-900">取引しなかったことを記録</h4>
              <p className="m-0 mt-2 text-sm leading-relaxed text-zinc-600">
                チャンスがなかった、または条件を満たさなかった判断も、大切な記録として残ります。
              </p>
            </div>
            <button
              type="button"
              data-testid="skip-save"
              onClick={() => void saveSkipQuick()}
              disabled={skipSaving}
              className="btn-cta min-h-14 w-full rounded-xl px-4 text-sm font-bold disabled:cursor-wait disabled:opacity-60"
            >
              {skipSaving ? "保存中..." : "見送りを記録"}
            </button>
            <p className="m-0 mt-2 text-center text-xs text-zinc-500">保存するとホームへ戻ります。</p>
          </div>

          <details className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <summary className="min-h-11 cursor-pointer list-none py-2 text-sm font-bold text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              今日の学びを見る（約1分）
            </summary>
            <div className="mt-3 border-t border-blue-100 pt-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xl" aria-hidden>{getTodayLearningCard().emoji}</span>
                <h4 className="m-0 text-base font-bold text-zinc-900">{getTodayLearningCard().title}</h4>
              </div>
              <div className="space-y-2 text-sm leading-relaxed text-zinc-700">
                {getTodayLearningCard().content.map((line, i) => (
                  <p key={i} className="m-0">{line}</p>
                ))}
              </div>
            </div>
          </details>
        </section>
      )}

      {location.pathname === "/pre-trade" && (
        <section className="space-y-4 max-w-md mx-auto relative pb-4" data-testid="pre-trade-flow">
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => navigate("/")}
              className="min-h-11 rounded-lg px-2 text-sm font-semibold text-zinc-600 flex items-center gap-1 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
            >
              ← 戻る
            </button>
            <div className="text-center">
              <h3 className="text-lg font-bold m-0">取引前記録</h3>
              <p className="m-0 text-xs text-zinc-500">目安30秒</p>
            </div>
            <div className="min-w-16 text-right text-sm font-semibold text-zinc-500" aria-label={`3段階中${preTradeStep}段階目`}>
              {preTradeStep} / 3
            </div>
          </div>

          {memberSettings && !memberSettings.unlocked && dailyAttempts >= memberSettings.weekly_limit && !isTestMode && (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-sm font-medium" role="status">
              本日の取引記録は上限に達しています。見送りの記録は引き続き利用できます。
            </div>
          )}

          {/* 📊 トレード設計 Card */}
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-4 space-y-4">
            <div>
              <div className="font-bold text-zinc-900">
                {preTradeStep === 1 ? "いつもの設定を確認" : preTradeStep === 2 ? "今回の損失ラインを決める" : "判断の根拠を残す"}
              </div>
              <p className="m-0 mt-1 text-sm text-zinc-500">
                {preTradeStep === 1
                  ? "前回値を引き継いでいます。変更がなければそのまま進めます。"
                  : preTradeStep === 2
                    ? "エントリー予定価格と損切り価格から、安全条件を自動確認します。"
                    : "任意のタグと短いメモで、今回の判断を記録します。"}
              </p>
            </div>

            {preTradeStep === 1 && (
              <>
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-zinc-700">利用する口座</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: "live", label: "本番" },
                      { value: "practice", label: "練習" },
                    ] as const).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={mode === option.value}
                        onClick={() => setMode(option.value)}
                        className={`min-h-12 rounded-xl px-3 text-sm font-bold border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors ${mode === option.value
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white border-zinc-200 text-zinc-700"
                          }`}
                      >
                        {mode === option.value ? "✓ " : ""}{option.label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div>
                  <label htmlFor="pre-trade-pair" className="text-sm font-semibold text-zinc-700 mb-2 block">通貨ペア</label>
                  <select
                    id="pre-trade-pair"
                    value={selectedPairSymbol}
                    onChange={(e) => {
                      const nextPair = e.target.value;
                      if (nextPair !== selectedPairSymbol) {
                        setSelectedPairSymbol(nextPair);
                        setCurrentRate("");
                        setStopLossPrice("");
                      }
                    }}
                    className="min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-3 text-base font-semibold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">選択してください</option>
                    {currencyPairs.map((p) => (
                      <option key={p.id} value={p.symbol}>{p.symbol}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="pre-trade-balance" className="text-sm font-semibold text-zinc-700 mb-2 block">口座残高</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden>¥</span>
                    <input
                      id="pre-trade-balance"
                      type="text"
                      inputMode="numeric"
                      className="min-h-12 w-full rounded-xl border border-zinc-300 bg-white pl-8 pr-12 text-base font-semibold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="500,000"
                      value={accountBalance ? Number(accountBalance).toLocaleString("ja-JP") : ""}
                      onChange={(e) => setAccountBalance(e.target.value.replace(/[^0-9]/g, ""))}
                      aria-describedby="pre-trade-balance-help"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500" aria-hidden>円</span>
                  </div>
                  <p id="pre-trade-balance-help" className="m-0 mt-2 text-xs leading-relaxed text-zinc-500">
                    {rememberedBalanceUpdatedAt
                      ? `前回入力した金額・${new Date(rememberedBalanceUpdatedAt).toLocaleDateString("ja-JP")}更新`
                      : "入力した金額は、この口座の次回記録にも引き継がれます。"}
                  </p>
                  {rememberedBalanceAgeDays !== null && rememberedBalanceAgeDays >= 7 && (
                    <p className="m-0 mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800" role="status">
                      前回の更新から7日以上経っています。残高に変更がないか確認してください。
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-zinc-700">今回の損失上限</span>
                    <span className="text-sm font-bold text-blue-700">口座残高の2%</span>
                  </div>
                  <p className="m-0 mt-1 text-xs text-zinc-600">資金を守り、記録を続けるための安全設定です。</p>
                </div>

                <button
                  type="button"
                  data-testid="pre-trade-next"
                  onClick={() => setPreTradeStep(2)}
                  disabled={!selectedPairSymbol || Number(accountBalance) <= 0}
                  className="btn-cta min-h-14 w-full rounded-xl font-bold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  損失ラインを決める
                </button>
              </>
            )}

            {/* 参考レートと損切り価格 */}
            {preTradeStep === 2 && selectedPairSymbol && (
              <div className="space-y-3">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-semibold text-zinc-700">
                      エントリー予定レート
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      data-testid="pre-trade-entry-rate"
                      type="text"
                      inputMode="decimal"
                      className="min-h-12 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-base font-bold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-mono"
                      placeholder={getEntryPricePlaceholder(selectedPairSymbol)}
                      value={currentRate}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, "");
                        setCurrentRate(val);
                      }}
                    />
                  </div>
                  <div className="text-xs text-zinc-500 mt-2">チャートでエントリーを予定している価格です。</div>
                </div>

                <div className="rounded-xl border-2 border-rose-100 bg-rose-50/30 p-3">
                  <label className="text-sm font-semibold text-rose-700 mb-2 block">
                    損切りレート
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      data-testid="pre-trade-stop-loss-rate"
                      type="text"
                      inputMode="decimal"
                      className="w-full rounded-xl border-2 border-rose-200 bg-white px-3 py-3 text-lg font-black text-rose-700 focus:border-rose-500 focus:outline-none transition-all text-center font-mono"
                      placeholder={getStopLossPricePlaceholder(selectedPairSymbol)}
                      value={stopLossPrice ?? ''}
                      onChange={(e) => setStopLossPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                    />
                  </div>
                  {/* 参考表示：差分を小さく表示 */}
                  {Number(stopLossPips) > 0 && currentRate !== "" && stopLossPrice !== "" && (
                    <div className="text-[11px] font-medium text-rose-600/80 text-center animate-in fade-in duration-300 bg-white/50 py-1.5 rounded-lg border border-rose-100/50">
                      差: {Math.abs(Number(currentRate) - Number(stopLossPrice)).toFixed(selectedPairSymbol?.includes('JPY') || selectedPairSymbol?.includes('XAU') ? 2 : 4)}
                      <span className="mx-1">/</span>
                      <span className="font-bold text-rose-600">（{stopLossPips} pips）</span>
                    </div>
                  )}
                  <div className="text-xs text-rose-700 mt-2 text-center">この価格に達したら撤退するラインです。</div>
                </div>
              </div>
            )}

            {/* 自動逆算された利確 pips */}
            {preTradeStep === 2 && Number(stopLossPips) > 0 && (
              <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-emerald-700">利確目安（RR 3:1）</div>
                    <div className="text-2xl font-black text-emerald-700 mt-1">
                      {autoTakeProfitPips} <span className="text-sm font-bold">pips</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-zinc-500">損切り</div>
                    <div className="text-sm font-bold text-zinc-600">{stopLossPips} pips</div>
                    <div className="text-xs text-zinc-500 mt-1">× 3.0</div>
                  </div>
                </div>
                <div className="text-xs text-emerald-700 mt-2">
                  この利確幅をチャート上でも確認してください。
                </div>
              </div>
            )}

            {/* 任意：利確pips手動調整（上級者向け） */}
            {preTradeStep === 2 && Number(stopLossPips) > 0 && (
              <details className="text-xs">
                <summary className="text-zinc-400 cursor-pointer hover:text-zinc-600 font-bold">利確pipsを手動調整する（上級）</summary>
                <div className="mt-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full rounded-xl border-2 border-zinc-100 bg-zinc-50/50 px-3 py-2 text-sm font-bold focus:border-blue-500 focus:bg-white focus:outline-none transition-all"
                    placeholder={`推奨: ${autoTakeProfitPips} pips`}
                    value={takeProfitPips}
                    onChange={(e) => setTakeProfitPips(e.target.value.replace(/[^0-9.]/g, ""))}
                  />
                  {Number(takeProfitPips) > 0 && Number(takeProfitPips) !== autoTakeProfitPips && (
                    <div className="mt-1 text-[10px] text-amber-600">
                      ⚠️ RR比が {(Number(takeProfitPips) / Number(stopLossPips)).toFixed(2)}:1 に変更されます（推奨: 3:1）
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* 自動計算結果パネル */}
            {preTradeStep === 2 && tradeMetrics && (
              <div className="rounded-xl bg-gradient-to-br from-zinc-50 to-blue-50/30 border border-zinc-100 p-4 space-y-3">
                <div className="text-xs font-bold text-zinc-500">安全設計の計算結果</div>

                {/* ロット数（メイン表示） */}
                <div className="text-center py-2">
                  <div className="text-xs text-zinc-500 font-bold">適正ロット数</div>
                  <div className="text-3xl font-black text-zinc-900 mt-1">{tradeMetrics.lotSize}</div>
                  <div className="text-xs text-zinc-500">ロット</div>
                </div>

                {/* 詳細数値 */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between items-center bg-white rounded-lg px-2 py-1.5">
                    <span className="text-zinc-500 text-xs">リスク金額</span>
                    <span className={`font-bold ${tradeMetrics.isRiskOk ? 'text-blue-600' : 'text-rose-500'}`}>
                      ¥{tradeMetrics.riskAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white rounded-lg px-2 py-1.5">
                    <span className="text-zinc-500 text-xs">利確金額</span>
                    <span className="font-bold text-emerald-600">
                      ¥{tradeMetrics.takeProfitAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white rounded-lg px-2 py-1.5">
                    <span className="text-zinc-500 text-xs">RR比</span>
                    <span className={`font-black ${tradeMetrics.isRrOk ? 'text-blue-600' : 'text-amber-500'}`}>
                      {tradeMetrics.riskRewardRatio}:1
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white rounded-lg px-2 py-1.5">
                    <span className="text-zinc-500 text-xs">1pip価値</span>
                    <span className="font-bold text-zinc-700">
                      ¥{tradeMetrics.pipValue.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* ゲート自動判定ステータス */}
                <div className="flex gap-2 justify-center pt-1">
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${tradeMetrics.isRrOk ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>
                    RR {tradeMetrics.isRrOk ? '✓ OK' : '✗ NG'}
                  </span>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${tradeMetrics.isRiskOk ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>
                    リスク {tradeMetrics.isRiskOk ? '✓ OK' : '✗ NG'}
                  </span>
                </div>
              </div>
            )}

            {preTradeStep === 2 && (
              <div className="space-y-3">
                {!tradeEntryGatesOk && currentRate && stopLossPrice && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">
                    安全条件を満たしていません。価格を見直すか、今回は見送りとして記録できます。
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPreTradeStep(1)}
                    className="min-h-12 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-bold text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    戻る
                  </button>
                  <button
                    type="button"
                    data-testid="pre-trade-next"
                    onClick={() => setPreTradeStep(3)}
                    disabled={!tradeEntryGatesOk}
                    className="btn-cta min-h-12 rounded-xl px-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    根拠を記録する
                  </button>
                </div>
                {!tradeEntryGatesOk && (
                  <button
                    type="button"
                    onClick={() => void saveSkipQuick()}
                    className="min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm font-bold text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    見送りとして記録
                  </button>
                )}
              </div>
            )}
          </div>



          {preTradeStep === 3 && (
          <div className="space-y-4 pt-2">
            {tradeEntryGatesOk ? (
              <div className="space-y-6">
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="mb-3">
                    <div className="text-sm font-bold text-zinc-900">今回の見立て（任意）</div>
                    <p className="m-0 mt-1 text-xs text-zinc-500">未回答のままでも記録できます。既定値で判断を保存しません。</p>
                  </div>
                  <div className="space-y-4">
                    <fieldset>
                      <legend className="mb-2 text-sm font-semibold text-zinc-700">成功確率</legend>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { value: "low", label: "低" },
                          { value: "mid", label: "中" },
                          { value: "high", label: "高" },
                        ] as const).map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={successProb === option.value}
                            onClick={() => setSuccessProb(successProb === option.value ? null : option.value)}
                            className={`min-h-11 rounded-xl border text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${successProb === option.value
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-zinc-300 bg-white text-zinc-700"
                              }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <fieldset>
                      <legend className="mb-2 text-sm font-semibold text-zinc-700">期待値</legend>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { value: "minus", label: "なし" },
                          { value: "unknown", label: "不明" },
                          { value: "plus", label: "あり" },
                        ] as const).map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={expectedValue === option.value}
                            onClick={() => setExpectedValue(option.value)}
                            className={`min-h-11 rounded-xl border text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${expectedValue === option.value
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-zinc-300 bg-white text-zinc-700"
                              }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  </div>
                </div>

                {/* 📝 環境認識タグ（10個） */}
                <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div>
                    <div className="text-sm font-bold text-zinc-900">
                      環境認識タグ
                    </div>
                    <p className="m-0 mt-1 text-xs text-zinc-500">任意・複数選択できます。</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "preEnvSign", label: "✅ サイン点灯", isActive: preEnvSign },
                      { id: "preEnvTrend4hUp", label: "📈 4Hトレンド一致", isActive: preEnvTrend4hUp },
                      { id: "preEnvRange4h", label: "↔️ 4Hレンジ内", isActive: preEnvRange4h },
                      { id: "preEnvSupport15m", label: "🛡️ 15Mサポレジ", isActive: preEnvSupport15m },
                      { id: "preEnvLongWick15m", label: "🕯️ 15M長髭", isActive: preEnvLongWick15m },
                      { id: "preEnvFlag", label: "🚩 フラッグ", isActive: preEnvFlag },
                      { id: "preEnvTriangle", label: "📐 三角持ち合い", isActive: preEnvTriangle },
                      { id: "preEnvLondon", label: "🇬🇧 ロンドン時間", isActive: preEnvLondon },
                      { id: "preEnvNewyork", label: "🇺🇸 NY時間", isActive: preEnvNewyork },
                      { id: "preEnvAsPlanned", label: "📝 シナリオ通り", isActive: preEnvAsPlanned },
                    ].map((tag) => {
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          aria-pressed={tag.isActive}
                          onClick={() => setPreEnv({ [tag.id]: !tag.isActive })}
                          className={`min-h-11 rounded-xl px-3 py-2.5 text-left text-xs font-bold border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors ${tag.isActive
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                            }`}
                        >
                          {tag.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 📝 メモ */}
                <div className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="text-sm font-bold text-zinc-900 flex items-center gap-1">
                    <span>仮説メモ（根拠）</span>
                    <span className="text-xs text-rose-600 font-bold">必須</span>
                  </div>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 bg-white p-4 text-base text-zinc-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                    rows={3}
                    placeholder="なぜここでエントリーするのか？根拠を記入してください..."
                  />
                </div>

                {/* Gate 4: Rule OK */}
                <div>
                  <PreTradeChecklist
                    items={[
                      { id: "gate_rule_ok", label: "Rule OK", checked: gateHelp.rule }
                    ]}
                    onToggle={(_, checked) => setGateHelp((prev) => ({ ...prev, rule: checked }))}
                  />
                </div>

                <div className="sticky bottom-[calc(0.5rem+env(safe-area-inset-bottom))] z-20 space-y-2 rounded-2xl border border-white/80 bg-white/95 p-3 shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur">
                  {(!note.trim() || !gateHelp.rule) && (
                    <p className="m-0 text-center text-xs text-zinc-600" role="status">
                      {!note.trim() ? "根拠メモを入力してください。" : "ルール確認を完了してください。"}
                    </p>
                  )}
                  <div className="grid grid-cols-[0.7fr_1.3fr] gap-2">
                    <button
                      type="button"
                      onClick={() => setPreTradeStep(2)}
                      className="min-h-14 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-bold text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      戻る
                    </button>
                    <button
                      data-testid="pre-trade-save"
                      onClick={() => void savePre()}
                      disabled={(dailyLocked && !isTestMode) || !note.trim() || !gateHelp.rule}
                      className="btn-cta min-h-14 rounded-xl px-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      取引前記録を保存
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-center">
                  <div className="text-rose-800 font-bold text-sm">前提条件を満たしていません</div>
                  <div className="text-rose-600 text-xs mt-1">今日は見送るのが正解です。</div>
                </div>

                <button
                  onClick={() => void saveSkipQuick()}
                  className="btn-cta w-full h-14 rounded-xl font-bold"
                >
                  見送りとして記録
                </button>
              </div>
            )}
          </div>
          )}
        </section>
      )
      }

      {
        location.pathname === "/post-trade" && (
          <section className="space-y-4 max-w-md mx-auto relative pb-4" data-testid="post-trade-flow">
            <div className="flex items-center justify-between px-1">
              <button
                onClick={() => {
                  if (completeLogId) {
                    window.history.pushState({}, "", "/");
                  }
                  navigate("/");
                }}
                className="min-h-11 rounded-lg px-2 text-sm font-semibold text-zinc-600 flex items-center gap-1 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                ← 戻る
              </button>
              <div className="text-center">
                <h3 className="text-lg font-bold m-0">取引後記録</h3>
                <p className="m-0 text-xs text-zinc-500">目安60秒</p>
              </div>
              <div className="min-w-16 text-right text-sm font-semibold text-zinc-500" aria-label={`2段階中${postTradeStep}段階目`}>
                {postTradeStep} / 2
              </div>
            </div>

            {!pending ? (
              <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-6 text-center">
                <p className="text-sm text-zinc-600 mb-4">未完の記録がありません。先に「取引前」を記録してください。</p>
                <button
                  onClick={() => {
                    if (completeLogId) {
                      window.history.pushState({}, "", "/");
                    }
                    navigate("/");
                  }}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 transition-colors"
                >
                  戻る
                </button>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="m-0 text-xs font-semibold text-zinc-500">取引前の計画</p>
                      <p className="mt-1 mb-0 text-base font-bold text-zinc-900">
                        {pending.currency_pair_symbol || "通貨ペア未設定"}
                      </p>
                    </div>
                    <p className="m-0 text-right text-xs text-zinc-500">
                      {new Date(pending.occurred_at).toLocaleString()}
                    </p>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-zinc-50 px-3 py-2">
                      <dt className="text-xs text-zinc-500">損切り</dt>
                      <dd className="mt-1 mb-0 font-semibold text-zinc-800">
                        {pending.stop_loss_pips != null ? `${pending.stop_loss_pips} pips` : "未設定"}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-zinc-50 px-3 py-2">
                      <dt className="text-xs text-zinc-500">利確</dt>
                      <dd className="mt-1 mb-0 font-semibold text-zinc-800">
                        {pending.take_profit_pips != null ? `${pending.take_profit_pips} pips` : "未設定"}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-zinc-50 px-3 py-2">
                      <dt className="text-xs text-zinc-500">ロット</dt>
                      <dd className="mt-1 mb-0 font-semibold text-zinc-800">
                        {pending.calculated_lot != null ? pending.calculated_lot : "未設定"}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-zinc-50 px-3 py-2">
                      <dt className="text-xs text-zinc-500">計画RR</dt>
                      <dd className="mt-1 mb-0 font-semibold text-zinc-800">
                        {pending.risk_reward_ratio != null ? `1:${pending.risk_reward_ratio}` : "未設定"}
                      </dd>
                    </div>
                  </dl>
                  {pending.note && (
                    <details className="mt-3 rounded-xl border border-zinc-200 bg-white">
                      <summary className="min-h-11 cursor-pointer px-3 py-3 text-sm font-semibold text-zinc-700">
                        取引前の根拠を見る
                      </summary>
                      <p className="m-0 border-t border-zinc-100 px-3 py-3 text-sm leading-relaxed text-zinc-600">
                        {pending.note}
                      </p>
                    </details>
                  )}
                </div>

                {postTradeStep === 1 ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm space-y-5">
                      <div>
                        <h4 className="m-0 text-base font-bold text-zinc-900">結果を事実で記録</h4>
                        <p className="mt-1 mb-0 text-xs leading-relaxed text-zinc-500">
                          まずは方向と結果だけ。損益とRRは分かる場合だけで構いません。
                        </p>
                      </div>

                      <fieldset className="space-y-2">
                        <legend className="text-sm font-semibold text-zinc-700">売買方向</legend>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { value: "long" as const, label: "ロング" },
                            { value: "short" as const, label: "ショート" },
                          ].map((item) => (
                            <button
                              key={item.value}
                              type="button"
                              data-testid={`post-side-${item.value}`}
                              aria-pressed={postSide === item.value}
                              onClick={() => setPostSide(item.value)}
                              className={`min-h-11 rounded-xl border px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                                postSide === item.value
                                  ? "border-blue-600 bg-blue-50 text-blue-700"
                                  : "border-zinc-200 bg-white text-zinc-600"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </fieldset>

                      <fieldset className="space-y-2">
                        <legend className="text-sm font-semibold text-zinc-700">取引結果</legend>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: "win" as const, label: "利益" },
                            { value: "loss" as const, label: "損失" },
                            { value: "be" as const, label: "建値" },
                          ].map((item) => (
                            <button
                              key={item.value}
                              type="button"
                              data-testid={`post-result-${item.value}`}
                              aria-pressed={postResult === item.value}
                              onClick={() => setPostResult(item.value)}
                              className={`min-h-11 rounded-xl border px-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                                postResult === item.value
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : "border-zinc-200 bg-white text-zinc-600"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </fieldset>

                      <div className="grid grid-cols-2 gap-3">
                        <label className="space-y-2 text-sm font-semibold text-zinc-700">
                          損益（任意）
                          <input
                            data-testid="post-pl"
                            type="text"
                            inputMode="decimal"
                            value={postPl}
                            onChange={(e) => setPostPl(e.target.value.replace(/[^0-9.-]/g, ""))}
                            placeholder="例: 5000"
                            className="min-h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-base font-semibold text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          />
                        </label>
                        <label className="space-y-2 text-sm font-semibold text-zinc-700">
                          実際のRR（任意）
                          <input
                            data-testid="post-rr"
                            type="text"
                            inputMode="decimal"
                            value={postRrText}
                            onChange={(e) => setPostRrText(e.target.value.replace(/[^0-9.:/-]/g, ""))}
                            placeholder="例: 1:3.2"
                            className="min-h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-base font-semibold text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="sticky bottom-[calc(0.5rem+env(safe-area-inset-bottom))] z-20 space-y-2 rounded-2xl border border-white/80 bg-white/95 p-3 shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur">
                      {(!postSide || !postResult) && (
                        <p className="m-0 text-center text-xs text-zinc-600" role="status">
                          売買方向と取引結果を選んでください。
                        </p>
                      )}
                      <button
                        type="button"
                        data-testid="post-trade-next"
                        disabled={!postSide || !postResult}
                        onClick={() => setPostTradeStep(2)}
                        className="btn-cta min-h-14 w-full rounded-xl px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        ルールを振り返る
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm space-y-4">
                      <div>
                        <h4 className="m-0 text-base font-bold text-zinc-900">計画どおりだったか確認</h4>
                        <p className="mt-1 mb-0 text-xs leading-relaxed text-zinc-500">
                          良し悪しではなく、事前に決めた内容と照らして回答します。
                        </p>
                      </div>

                      {[
                        {
                          id: "postRuleRespected",
                          label: "取引前に決めたルールを守った",
                          value: postRuleRespected,
                          setter: setPostRuleRespected,
                        },
                        {
                          id: "postInExpectedRange",
                          label: "想定した範囲内の値動きだった",
                          value: postInExpectedRange,
                          setter: setPostInExpectedRange,
                        },
                        {
                          id: "postGoodParticipation",
                          label: "取引前に記録した条件で参入した",
                          value: postGoodParticipation,
                          setter: setPostGoodParticipation,
                        },
                      ].map((item) => (
                        <fieldset key={item.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                          <legend className="px-1 text-sm font-semibold leading-relaxed text-zinc-800">
                            {item.label}
                          </legend>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              data-testid={`${item.id}-yes`}
                              aria-pressed={item.value === true}
                              onClick={() => item.setter(true)}
                              className={`min-h-11 rounded-xl border px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                                item.value === true
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : "border-zinc-200 bg-white text-zinc-600"
                              }`}
                            >
                              はい
                            </button>
                            <button
                              type="button"
                              data-testid={`${item.id}-no`}
                              aria-pressed={item.value === false}
                              onClick={() => item.setter(false)}
                              className={`min-h-11 rounded-xl border px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                                item.value === false
                                  ? "border-rose-600 bg-rose-50 text-rose-700"
                                  : "border-zinc-200 bg-white text-zinc-600"
                              }`}
                            >
                              いいえ
                            </button>
                          </div>
                        </fieldset>
                      ))}

                      <details className="rounded-xl border border-zinc-200 bg-white">
                        <summary className="min-h-11 cursor-pointer px-3 py-3 text-sm font-semibold text-zinc-700">
                          メモを追加（任意）
                        </summary>
                        <div className="space-y-4 border-t border-zinc-100 p-3">
                          <label className="block space-y-2 text-sm font-semibold text-zinc-700">
                            次回確認したいこと
                            <textarea
                              value={postReferencePoint}
                              onChange={(e) => setPostReferencePoint(e.target.value)}
                              className="w-full resize-none rounded-xl border border-zinc-200 bg-white p-3 text-base font-normal text-zinc-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                              rows={2}
                              placeholder="次回に活かす確認事項"
                            />
                          </label>
                          <label className="block space-y-2 text-sm font-semibold text-zinc-700">
                            事実メモ
                            <textarea
                              value={postNoteValue}
                              onChange={(e) => setPostNote(e.target.value)}
                              className="w-full resize-none rounded-xl border border-zinc-200 bg-white p-3 text-base font-normal text-zinc-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                              rows={2}
                              placeholder="記録しておきたい事実"
                            />
                          </label>
                        </div>
                      </details>
                    </div>

                    <div className="sticky bottom-[calc(0.5rem+env(safe-area-inset-bottom))] z-20 space-y-2 rounded-2xl border border-white/80 bg-white/95 p-3 shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur">
                      {(postRuleRespected === null || postInExpectedRange === null || postGoodParticipation === null) && (
                        <p className="m-0 text-center text-xs text-zinc-600" role="status">
                          3つの項目をすべて回答してください。
                        </p>
                      )}
                      <div className="grid grid-cols-[0.7fr_1.3fr] gap-2">
                        <button
                          type="button"
                          onClick={() => setPostTradeStep(1)}
                          className="min-h-14 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-bold text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          戻る
                        </button>
                        <button
                          type="button"
                          data-testid="post-trade-save"
                          disabled={
                            postSaving ||
                            postRuleRespected === null ||
                            postInExpectedRange === null ||
                            postGoodParticipation === null
                          }
                          onClick={() => void savePost()}
                          className="btn-cta min-h-14 rounded-xl px-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {postSaving ? "保存中..." : "取引後記録を保存"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )
      }

      {
        location.pathname === "/mypage" && (
          <MyPage level={level} />
        )
      }

      {
        isAnalysisRoute && session && (
          <AnalysisPage
            userId={session.user.id}
            onBack={() => navigate("/")}
          />
        )
      }

      {
        location.pathname === "/learning-contents" && (
          <LearningContentsPage />
        )
      }

      {
        location.pathname.startsWith("/learning/slides") && (
          <SlideViewerPage />
        )
      }

      {
        location.pathname === "/learning/videos" && (
          <VideoListPage />
        )
      }

      {
        location.pathname === "/import" && (
          <ImportPage />
        )
      }

      {
        session && !isAdminRoute && !isAnalysisRoute && showInstallPrompt && (
          <InstallPrompt onClose={() => setShowInstallPrompt(false)} />
        )
      }

      {
        session && !isAdminRoute && !isAnalysisRoute && !isFocusedRecordingRoute && (
          <>
            <NotificationPrompt />
            <BottomTabBar />
          </>
        )
      }
    </div >
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

const IconHistory = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: "middle" }}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

function Card(props: { children: React.ReactNode; style?: CSSProperties; className?: string }) {
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



function PrimaryButton(props: { onClick: () => void; children: React.ReactNode; disabled?: boolean; className?: string; style?: CSSProperties }) {
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
