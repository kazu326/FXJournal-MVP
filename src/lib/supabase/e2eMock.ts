type QueryResult = {
  data?: unknown;
  count?: number | null;
  error?: { message: string } | null;
};

const testUser = {
  id: "e2e-user",
  email: "e2e@example.com",
};

const testSession = {
  user: testUser,
  access_token: "e2e-token",
  refresh_token: "e2e-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
};

const today = () => new Date().toISOString();

type E2EState = {
  inserts: unknown[];
  checkinSubmitted: boolean;
  supportOpened: boolean;
  supportResolved: boolean;
  supportMessages: Array<{
    id: string;
    thread_id: string;
    sender_user_id: string;
    sender_kind: "member" | "staff";
    body: string;
    created_at: string;
  }>;
};

const getScenario = () => {
  if (typeof window === "undefined") return "default";
  const urlScenario = new URLSearchParams(window.location.search).get(
    "e2e-scenario",
  );
  if (urlScenario) return urlScenario;
  return window.localStorage.getItem("fxj_e2e_scenario") ?? "default";
};

const ensureState = () => {
  if (typeof window === "undefined") {
    return {
      inserts: [],
      checkinSubmitted: false,
      supportOpened: false,
      supportResolved: false,
      supportMessages: [],
    } satisfies E2EState;
  }

  const current = (
    window as typeof window & { __FXJ_E2E_STATE__?: E2EState }
  ).__FXJ_E2E_STATE__;
  if (current) return current;

  const next: E2EState = {
    inserts: [],
    checkinSubmitted: false,
    supportOpened: false,
    supportResolved: false,
    supportMessages: [],
  };
  (
    window as typeof window & { __FXJ_E2E_STATE__: E2EState }
  ).__FXJ_E2E_STATE__ = next;
  return next;
};

class MockQuery {
  private operation: "select" | "insert" | "upsert" | "update" = "select";
  private rows: unknown[] = [];
  private wantCount = false;
  private maybeSingleResult = false;
  private singleResult = false;
  private unfinishedTradeLookup = false;
  private readonly table: string;
  private filters: Record<string, unknown> = {};

  constructor(table: string) {
    this.table = table;
  }

  select(_columns?: string, options?: { count?: string; head?: boolean }) {
    this.operation = "select";
    this.wantCount = options?.count === "exact";
    return this;
  }

  insert(rows: unknown[]) {
    this.operation = "insert";
    this.rows = rows;
    return this;
  }

  upsert(rows: unknown) {
    this.operation = "upsert";
    this.rows = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  update(row: unknown) {
    this.operation = "update";
    this.rows = [row];
    return this;
  }

  eq(column?: string, value?: unknown) {
    if (column) this.filters[column] = value;
    return this;
  }
  neq() { return this; }
  gte() { return this; }
  is() { return this; }
  or(filters?: string) {
    if (
      this.table === "trade_logs" &&
      filters?.includes("post_gate_kept.is.null")
    ) {
      this.unfinishedTradeLookup = true;
    }
    return this;
  }
  order() { return this; }
  limit() { return this; }
  in() { return this; }

  maybeSingle() {
    this.maybeSingleResult = true;
    return this;
  }

  single() {
    this.singleResult = true;
    return this;
  }

  then(resolve: (value: QueryResult) => void, reject?: (reason?: unknown) => void) {
    return Promise.resolve(this.resolve()).then(resolve, reject);
  }

  private resolve(): QueryResult {
    const scenario = getScenario();

    if (this.operation === "insert") {
      if (scenario === "insert-error") {
        return { data: null, error: { message: "E2E insert failure" } };
      }

      ensureState().inserts.push({ table: this.table, rows: this.rows });
      const firstRow = (this.rows[0] ?? {}) as Record<string, unknown>;
      const data = {
        id: `e2e-${this.table}-${ensureState().inserts.length}`,
        occurred_at: today(),
        gate_all_ok: false,
        voided_at: null,
        completed_at: null,
        ...firstRow,
      };
      return { data: this.singleResult ? data : [data], error: null };
    }

    if (this.operation === "upsert" || this.operation === "update") {
      return { data: this.singleResult ? this.rows[0] : this.rows, error: null };
    }

    if (this.table === "profiles") {
      const profile = {
        user_id: testUser.id,
        role: "admin",
        display_name: "E2E Admin",
        level: scenario === "progress" ? 3 : 1,
        current_xp: scenario === "progress" ? 42 : 0,
        login_streak: scenario === "progress" ? 7 : 0,
        onboarding_completed: true,
      };
      return { data: this.singleResult || this.maybeSingleResult ? profile : [profile], error: null };
    }

    if (this.table === "platform_admins") {
      const platformAdmin = { user_id: testUser.id };
      return { data: this.singleResult || this.maybeSingleResult ? platformAdmin : [platformAdmin], error: null };
    }

    if (this.table === "member_settings") {
      const settings = {
        member_user_id: testUser.id,
        weekly_limit: 2,
        max_risk_percent: 2,
        unlocked: false,
        note: null,
      };
      return { data: this.singleResult || this.maybeSingleResult ? settings : [settings], error: null };
    }

    if (scenario === "lecture-progress" && this.table === "courses") {
      return {
        data: [{
          id: "course-foundations",
          title: "判断の土台",
          description: "取引前に確認したい基本を、順番に身につけます。",
          sequence_number: 1,
          is_required: true,
          icon: "book",
          created_at: "2026-01-01T00:00:00.000Z",
        }],
        error: null,
      };
    }

    if (scenario === "lecture-progress" && this.table === "lectures") {
      return {
        data: [
          {
            id: "lecture-1",
            course_id: "course-foundations",
            sequence_number: 1,
            title: "トレード前に確認すること",
            content_type: "video",
            video_url: "https://example.com/lecture-1",
            youtube_video_id: null,
            slide_url: null,
            external_url: null,
            duration_minutes: 6,
            is_required: true,
          },
          {
            id: "lecture-2",
            course_id: "course-foundations",
            sequence_number: 2,
            title: "損失を限定する考え方",
            content_type: "video",
            video_url: "https://example.com/lecture-2",
            youtube_video_id: null,
            slide_url: null,
            external_url: null,
            duration_minutes: 8,
            is_required: true,
          },
          {
            id: "lecture-3",
            course_id: "course-foundations",
            sequence_number: 3,
            title: "見送りを判断する基準",
            content_type: "pdf",
            video_url: null,
            youtube_video_id: null,
            slide_url: "https://example.com/lecture-3.pdf",
            external_url: null,
            duration_minutes: 5,
            is_required: true,
          },
          {
            id: "lecture-4",
            course_id: "course-foundations",
            sequence_number: 4,
            title: "記録から判断を振り返る",
            content_type: "article",
            video_url: null,
            youtube_video_id: null,
            slide_url: null,
            external_url: "https://example.com/lecture-4",
            duration_minutes: 7,
            is_required: true,
          },
        ],
        error: null,
      };
    }

    if (scenario === "lecture-progress" && this.table === "lecture_notes") {
      return {
        data: [
          {
            id: "lecture-note-1",
            lecture_id: "lecture-1",
            user_id: testUser.id,
            watch_progress: 100,
            completed_at: "2026-01-02T00:00:00.000Z",
          },
          {
            id: "lecture-note-2",
            lecture_id: "lecture-2",
            user_id: testUser.id,
            watch_progress: 45,
            completed_at: null,
          },
        ],
        error: null,
      };
    }

    if (this.table === "checkin_questions") {
      return {
        data: [
          {
            id: "question-goal-action",
            definition_id: "checkin-definition-v1",
            question_key: "goal_action",
            position: 1,
            prompt: "今月、決めていた目標行動をどの程度実行できましたか？",
            low_label: "ほとんどできなかった",
            high_label: "ほぼ毎回できた",
            allow_not_applicable: false,
          },
          {
            id: "question-rule-adherence",
            definition_id: "checkin-definition-v1",
            question_key: "rule_adherence",
            position: 2,
            prompt: "自分で決めた取引ルールをどの程度守れましたか？",
            low_label: "ほとんど守れなかった",
            high_label: "ほぼ毎回守れた",
            allow_not_applicable: false,
          },
          {
            id: "question-record-before-decision",
            definition_id: "checkin-definition-v1",
            question_key: "record_before_decision",
            position: 3,
            prompt: "気持ちが動いたとき、判断前に記録を残せましたか？",
            low_label: "ほとんど残せなかった",
            high_label: "ほぼ毎回残せた",
            allow_not_applicable: true,
          },
          {
            id: "question-skip-when-needed",
            definition_id: "checkin-definition-v1",
            question_key: "skip_when_needed",
            position: 4,
            prompt: "条件が合わないとき、見送る判断ができましたか？",
            low_label: "ほとんどできなかった",
            high_label: "ほぼ毎回できた",
            allow_not_applicable: true,
          },
          {
            id: "question-next-action",
            definition_id: "checkin-definition-v1",
            question_key: "next_action_clarity",
            position: 5,
            prompt: "来月に試す行動が明確になっていますか？",
            low_label: "まだ決まっていない",
            high_label: "具体的に決まっている",
            allow_not_applicable: false,
          },
        ],
        error: null,
      };
    }

    if (this.table === "monthly_feedback") {
      const showFeedback =
        ensureState().checkinSubmitted ||
        scenario === "messages-completed" ||
        scenario === "messages-admin";
      if (!showFeedback) {
        return {
          data: this.maybeSingleResult || this.singleResult ? null : [],
          error: null,
        };
      }
      const feedback = {
        id: "feedback-e2e",
        assignment_id: "checkin-assignment-e2e",
        user_id: testUser.id,
        organization_id: "org-e2e",
        period_start: "2026-07-01",
        signal: scenario === "messages-admin" ? "followup" : "on_track",
        status: scenario === "messages-admin" ? "draft" : "published",
        summary:
          "今月は記録が4件あり、そのうち完了記録が3件、見送り記録が1件でした。",
        interpretation:
          "結果ではなく、慎重な判断を記録できた過程を次の月にも残していきましょう。",
        next_action:
          "来月も、判断前の30秒記録を最初の1回から続けてみましょう。",
        evidence_card_id: "evidence-progress",
        created_at: today(),
      };
      return {
        data:
          this.maybeSingleResult || this.singleResult
            ? feedback
            : [feedback],
        error: null,
      };
    }

    if (this.table === "evidence_cards") {
      const evidence = {
        id: "evidence-progress",
        title: "進み具合を記録する",
        evidence_kind: "meta_analysis",
        source_name: "Harkin et al., Psychological Bulletin",
        source_year: 2016,
        source_url: "https://pubmed.ncbi.nlm.nih.gov/26479070/",
        summary:
          "目標の進み具合を確認する介入は、平均的には目標達成を後押ししました。",
        scope_note: "複数領域の目標行動を対象にした研究です。",
        limitation_note:
          "FXの成績や利益への効果を直接示す研究ではありません。",
      };
      return {
        data:
          this.maybeSingleResult || this.singleResult
            ? evidence
            : [evidence],
        error: null,
      };
    }

    if (this.table === "support_threads") {
      const showThread =
        ensureState().supportOpened ||
        scenario === "messages-support" ||
        scenario === "messages-admin";
      if (!showThread) {
        return {
          data: this.maybeSingleResult || this.singleResult ? null : [],
          error: null,
        };
      }
      const thread = {
        id: "support-thread-e2e",
        member_user_id: testUser.id,
        organization_id: "org-e2e",
        category: "record_habit",
        subject: "記録を忘れてしまう",
        status: ensureState().supportResolved
          ? "resolved"
          : scenario === "messages-admin"
            ? "waiting_staff"
            : "waiting_member",
        assigned_staff_user_id: "staff-e2e",
        last_message_at: today(),
        created_at: today(),
      };
      return {
        data:
          this.maybeSingleResult || this.singleResult ? thread : [thread],
        error: null,
      };
    }

    if (this.table === "support_messages") {
      const defaultMessages =
        scenario === "messages-support" || scenario === "messages-admin"
          ? [
              {
                id: "support-message-member",
                thread_id: "support-thread-e2e",
                sender_user_id: testUser.id,
                sender_kind: "member",
                body: "記録を後回しにして忘れてしまいます。",
                created_at: today(),
              },
              {
                id: "support-message-staff",
                thread_id: "support-thread-e2e",
                sender_user_id: "staff-e2e",
                sender_kind: "staff",
                body: "次の機会は、取引したくなったら先に記録画面を開く方法を試してみましょう。",
                created_at: today(),
              },
            ]
          : [];
      return {
        data: [...defaultMessages, ...ensureState().supportMessages],
        error: null,
      };
    }

    if (this.table === "announcements") {
      const rows =
        scenario.startsWith("messages-")
          ? [
              {
                id: "announcement-e2e",
                title: "今月の学習会について",
                body: "記録の振り返り方を一緒に確認します。",
                created_at: today(),
              },
            ]
          : [];
      return {
        data:
          this.singleResult || this.maybeSingleResult
            ? (rows[0] ?? null)
            : rows,
        error: null,
      };
    }

    if (this.table === "dm_messages") {
      const rows =
        scenario.startsWith("messages-")
          ? [
              {
                id: "legacy-message-e2e",
                body: "以前の個別メッセージです。",
                created_at: today(),
              },
            ]
          : [];
      return {
        data:
          this.singleResult || this.maybeSingleResult
            ? (rows[0] ?? null)
            : rows,
        error: null,
      };
    }

    if (this.table === "v_monthly_checkin_org_summary") {
      return {
        data:
          scenario === "messages-admin"
            ? [
                {
                  organization_id: "org-e2e",
                  period_start: "2026-07-01",
                  assigned_count: 8,
                  response_count: 6,
                  average_answer: 3.8,
                  followup_count: 1,
                },
              ]
            : [],
        error: null,
      };
    }

    if (this.table === "trade_logs") {
      if (this.wantCount) {
        return { count: scenario === "daily-limit" ? 2 : 0, data: null, error: null };
      }
      if (scenario === "pending-trade") {
        return {
          data: [{
            id: "pending-e2e-log",
            occurred_at: today(),
            log_type: "valid",
            gate_all_ok: true,
            success_prob: "mid",
            expected_value: "plus",
            completed_at: null,
            voided_at: null,
          }],
          error: null,
        };
      }
      if (scenario === "completed-trade") {
        if (this.unfinishedTradeLookup) {
          return { data: [], error: null };
        }
        return {
          data: [{
            id: "completed-e2e-log",
            occurred_at: today(),
            log_type: "valid",
            gate_all_ok: true,
            success_prob: "mid",
            expected_value: "plus",
            completed_at: today(),
            voided_at: null,
          }],
          error: null,
        };
      }
      return { data: [], error: null };
    }

    if (this.table === "v_risk_queue") {
      const rows = scenario === "risk-queue"
        ? [{
          user_id: "risk-user",
          member_id: "member-001",
          display_name: "Risk Queue User",
          email: "risk@example.com",
          invalid_7: 2,
          skip_7: 0,
          valid_7: 3,
          weekly_limit: 2,
          alert_invalid: true,
          alert_skip0: true,
          alert_over_weekly: true,
          last_log_id: "risk-log",
          last_log_at: today(),
        }]
        : [];
      return { data: rows, error: null };
    }

    return { data: [], error: null };
  }
}

export const e2eSupabase = {
  auth: {
    getSession: async () => ({ data: { session: testSession }, error: null }),
    getUser: async () => ({ data: { user: testUser }, error: null }),
    onAuthStateChange: () => ({
      data: {
        subscription: {
          unsubscribe: () => undefined,
        },
      },
    }),
    signInWithOtp: async () => ({ error: null }),
    signInWithOAuth: async () => ({ error: null }),
    signOut: async () => ({ error: null }),
  },
  from: (table: string) => new MockQuery(table),
  rpc: async (functionName: string, params?: Record<string, unknown>) => {
    const scenario = getScenario();
    const state = ensureState();

    if (functionName === "ensure_current_month_checkin") {
      const completed =
        state.checkinSubmitted || scenario === "messages-completed";
      return {
        data: {
          id: "checkin-assignment-e2e",
          definition_id: "checkin-definition-v1",
          user_id: testUser.id,
          organization_id: "org-e2e",
          period_start: "2026-07-01",
          period_end: "2026-07-31",
          due_at: "2026-07-31T14:59:59.000Z",
          status: completed ? "completed" : "due",
          support_requested: false,
          completed_at: completed ? today() : null,
        },
        error: null,
      };
    }

    if (functionName === "submit_monthly_checkin") {
      if (scenario === "insert-error") {
        return { data: null, error: { message: "E2E insert failure" } };
      }
      state.checkinSubmitted = true;
      return {
        data: [
          {
            feedback_id: "feedback-e2e",
            feedback_status: "published",
            feedback_signal:
              params?.p_support_requested === true
                ? "support_requested"
                : "on_track",
          },
        ],
        error: null,
      };
    }

    if (functionName === "open_support_thread") {
      state.supportOpened = true;
      state.supportMessages.push({
        id: "support-message-opened",
        thread_id: "support-thread-e2e",
        sender_user_id: testUser.id,
        sender_kind: "member",
        body: String(params?.p_body ?? ""),
        created_at: today(),
      });
      return {
        data: {
          id: "support-thread-e2e",
          member_user_id: testUser.id,
          organization_id: "org-e2e",
          category: String(params?.p_category ?? "record_habit"),
          subject: String(params?.p_subject ?? "相談"),
          status: "waiting_staff",
          assigned_staff_user_id: null,
          last_message_at: today(),
          created_at: today(),
        },
        error: null,
      };
    }

    if (functionName === "post_support_message") {
      const message = {
        id: `support-message-${state.supportMessages.length + 1}`,
        thread_id: String(params?.p_thread_id ?? "support-thread-e2e"),
        sender_user_id: testUser.id,
        sender_kind: scenario === "messages-admin" ? "staff" : "member",
        body: String(params?.p_body ?? ""),
        created_at: today(),
      } as const;
      state.supportMessages.push(message);
      return { data: message, error: null };
    }

    if (functionName === "set_support_thread_status") {
      state.supportResolved = params?.p_status === "resolved";
      return {
        data: {
          id: "support-thread-e2e",
          member_user_id: testUser.id,
          organization_id: "org-e2e",
          category: "record_habit",
          subject: "記録を忘れてしまう",
          status: String(params?.p_status ?? "resolved"),
          assigned_staff_user_id: "staff-e2e",
          last_message_at: today(),
          created_at: today(),
        },
        error: null,
      };
    }

    if (functionName === "publish_monthly_feedback") {
      return {
        data: {
          id: String(params?.p_feedback_id ?? "feedback-e2e"),
          assignment_id: "checkin-assignment-e2e",
          user_id: testUser.id,
          period_start: "2026-07-01",
          signal: "followup",
          status: "published",
          summary: "確認済みのフィードバックです。",
          interpretation: "記録と回答を一緒に確認しました。",
          next_action: "次の機会に判断前の記録を1回残しましょう。",
          evidence_card_id: "evidence-progress",
          created_at: today(),
        },
        error: null,
      };
    }

    return {
      data: { level: 1, currentXp: 0, xpGained: 0 },
      error: null,
    };
  },
  channel: () => {
    const channel = {
      on: () => channel,
      subscribe: () => channel,
    };
    return channel;
  },
  removeChannel: async () => undefined,
  functions: {
    invoke: async () => ({ data: null, error: null }),
  },
};
