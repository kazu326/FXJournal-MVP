-- サブスクリプション管理テーブル
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly', 'annual', 'trial')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'paused', 'expired')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  mrr_amount NUMERIC(10, 2) NOT NULL,
  canceled_at TIMESTAMPTZ,
  churn_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_canceled_at ON subscriptions(canceled_at) WHERE canceled_at IS NOT NULL;

-- RLS有効化 (Policy creation might fail if table/role doesn't exist, but simplified for this apply)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- updated_at 自動更新トリガー用関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger設定
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at 
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- コメント追加
COMMENT ON TABLE subscriptions IS 'ユーザーのサブスクリプション契約管理';
COMMENT ON COLUMN subscriptions.mrr_amount IS '月次経常収益（Monthly Recurring Revenue）';
COMMENT ON COLUMN subscriptions.churn_reason IS '解約理由（価格、機能不足、競合他社など）';

-- 支払い履歴管理テーブル
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT,
  transaction_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id) WHERE transaction_id IS NOT NULL;

-- RLS有効化
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- コメント追加
COMMENT ON TABLE payments IS '支払い履歴・トランザクション管理';
COMMENT ON COLUMN payments.transaction_id IS '決済プロバイダーのトランザクションID';

-- ユーザーテーブルへのカラム追加
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'subscription_start_date') 
  THEN
    ALTER TABLE users ADD COLUMN subscription_start_date TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'subscription_status') 
  THEN
    ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'inactive';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'lifetime_value') 
  THEN
    ALTER TABLE users ADD COLUMN lifetime_value NUMERIC(10, 2) DEFAULT 0;
  END IF;
END $$;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

-- コメント追加
COMMENT ON COLUMN users.subscription_start_date IS '初回サブスクリプション開始日';
COMMENT ON COLUMN users.subscription_status IS '現在のサブスクリプションステータス';
COMMENT ON COLUMN users.lifetime_value IS 'ユーザーの生涯顧客価値（LTV）キャッシュ';

-- View作成: v_user_ltv
CREATE OR REPLACE VIEW v_user_ltv AS
SELECT 
  u.id AS user_id,
  pr.email, -- Fixed: Get email from profiles
  COALESCE(SUM(p.amount), 0) AS lifetime_value,
  COUNT(DISTINCT s.id) AS subscription_count,
  MIN(s.start_date) AS first_subscription_date,
  MAX(CASE WHEN s.status = 'active' THEN s.end_date ELSE s.canceled_at END) AS last_subscription_date,
  ROUND(
    AVG(
      EXTRACT(EPOCH FROM (
        COALESCE(
          CASE WHEN s.status = 'active' THEN NOW() ELSE s.end_date END, 
          s.canceled_at, 
          NOW()
        ) - s.start_date
      )) / 86400 / 30
    )::NUMERIC, 
    2
  ) AS avg_subscription_months
FROM users u
LEFT JOIN profiles pr ON u.id = pr.user_id -- Fixed: Join profiles
LEFT JOIN subscriptions s ON u.id = s.user_id
LEFT JOIN payments p ON s.id = p.subscription_id AND p.status = 'completed'
GROUP BY u.id, pr.email;

COMMENT ON VIEW v_user_ltv IS 'ユーザーごとの生涯顧客価値（LTV）と契約期間算出';

-- View作成: v_churn_analysis
CREATE OR REPLACE VIEW v_churn_analysis AS
SELECT 
  DATE_TRUNC('month', canceled_at) AS churn_month,
  COUNT(*) AS churned_users,
  (SELECT COUNT(DISTINCT user_id) FROM subscriptions WHERE status = 'active') AS active_users,
  ROUND(
    COUNT(*) * 100.0 / NULLIF(
      (SELECT COUNT(DISTINCT user_id) FROM subscriptions WHERE status = 'active'), 
      0
    ), 
    2
  ) AS churn_rate_percent,
  STRING_AGG(DISTINCT churn_reason, ', ') AS common_reasons
FROM subscriptions
WHERE canceled_at IS NOT NULL
GROUP BY DATE_TRUNC('month', canceled_at)
ORDER BY churn_month DESC;

COMMENT ON VIEW v_churn_analysis IS '月次解約率と主な解約理由の分析';

-- View作成: v_mrr_arr_summary
CREATE OR REPLACE VIEW v_mrr_arr_summary AS
SELECT 
  COUNT(DISTINCT user_id) AS active_subscribers,
  SUM(CASE WHEN plan_type = 'monthly' THEN mrr_amount ELSE 0 END) AS monthly_mrr,
  SUM(CASE WHEN plan_type = 'annual' THEN mrr_amount / 12 ELSE 0 END) AS annual_contribution_to_mrr,
  SUM(CASE WHEN plan_type = 'trial' THEN 0 ELSE mrr_amount END) AS total_mrr,
  SUM(CASE WHEN plan_type = 'trial' THEN 0 ELSE mrr_amount END) * 12 AS arr,
  ROUND(AVG(mrr_amount), 2) AS avg_revenue_per_user,
  (SELECT COUNT(*) FROM subscriptions WHERE status = 'trial') AS trial_users
FROM subscriptions
WHERE status = 'active';

COMMENT ON VIEW v_mrr_arr_summary IS 'MRR（月次経常収益）とARR（年次経常収益）の集計';

-- View作成: v_behavior_compliance_report
CREATE OR REPLACE VIEW v_behavior_compliance_report AS
SELECT 
  u.id AS user_id,
  pr.email, -- Fixed: Get email from profiles
  u.created_at AS user_registration_date,
  abc.first_learning_date,
  abc.trades_before_learning,
  abc.trades_after_learning,
  abc.change_percentage AS behavior_change_percent,
  aod.trade_date AS last_overtrading_date,
  CASE WHEN aod.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS risk_detected,
  alp.course_title,
  alp.completion_percentage AS learning_completion_rate, -- Fixed: completion_rate -> completion_percentage
  v.lifetime_value,
  v.avg_subscription_months,
  v.first_subscription_date,
  s.status AS subscription_status,
  s.start_date AS current_subscription_start,
  s.end_date AS current_subscription_end,
  s.plan_type,
  s.mrr_amount AS monthly_revenue,
  s.canceled_at,
  s.churn_reason
FROM users u
LEFT JOIN profiles pr ON u.id = pr.user_id -- Fixed: Join profiles
LEFT JOIN admin_behavior_change abc ON u.id = abc.user_id
LEFT JOIN admin_overtrading_detection aod ON u.id = aod.user_id
LEFT JOIN admin_learning_progress alp ON u.id = alp.user_id
LEFT JOIN v_user_ltv v ON u.id = v.user_id
LEFT JOIN LATERAL (
  SELECT * FROM subscriptions 
  WHERE user_id = u.id 
  ORDER BY created_at DESC 
  LIMIT 1
) s ON TRUE;

COMMENT ON VIEW v_behavior_compliance_report IS '行動変容、リスク検出、学習進捗、LTVを統合した当局提出用レポート';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_admins') THEN
    DROP POLICY IF EXISTS "Platform admins can view all subscriptions" ON subscriptions;
    CREATE POLICY "Platform admins can view all subscriptions" ON subscriptions FOR SELECT
      USING (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()));
      
    DROP POLICY IF EXISTS "Platform admins can view all payments" ON payments;
    CREATE POLICY "Platform admins can view all payments" ON payments FOR SELECT
      USING (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()));
  END IF;
END $$;
