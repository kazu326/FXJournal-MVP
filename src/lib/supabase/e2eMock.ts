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

const getScenario = () => {
  if (typeof window === "undefined") return "default";
  return window.localStorage.getItem("fxj_e2e_scenario") ?? "default";
};

const ensureState = () => {
  if (typeof window === "undefined") {
    return { inserts: [] as unknown[] };
  }

  const current = (window as typeof window & { __FXJ_E2E_STATE__?: { inserts: unknown[] } }).__FXJ_E2E_STATE__;
  if (current) return current;

  const next = { inserts: [] as unknown[] };
  (window as typeof window & { __FXJ_E2E_STATE__: { inserts: unknown[] } }).__FXJ_E2E_STATE__ = next;
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

  eq() { return this; }
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
  rpc: async () => ({ data: { level: 1, currentXp: 0, xpGained: 0 }, error: null }),
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
