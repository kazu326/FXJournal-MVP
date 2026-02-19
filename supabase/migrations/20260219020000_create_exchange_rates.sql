-- 為替レートマスタテーブル
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code TEXT UNIQUE NOT NULL, -- 'USD', 'EUR', 'GBP', etc.
  jpy_rate NUMERIC NOT NULL,          -- 対円レート
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- RLS有効化
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- ポリシー設定
-- 読み取りは誰でも可能（未ログインでもレートは見えて良いかもしれないが、基本はアプリ内利用なのでログイン前提が無難。ただPreTradePageはログイン済みのはず）
CREATE POLICY "Enable read access for all users" ON exchange_rates
    FOR SELECT USING (true);

-- 更新・挿入は認証済みユーザーのみ（本来はAdminのみだが、ロールがないのでauthenticatedで制限）
CREATE POLICY "Enable insert for authenticated users only" ON exchange_rates
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON exchange_rates
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 初期データ投入
INSERT INTO exchange_rates (currency_code, jpy_rate) VALUES
  ('USD', 150.00),
  ('EUR', 162.00),
  ('GBP', 190.00),
  ('AUD', 99.00),
  ('NZD', 93.00),
  ('CAD', 110.00),
  ('CHF', 170.00)
ON CONFLICT (currency_code) DO NOTHING;

-- 更新トリガー（updated_atを自動更新）
CREATE OR REPLACE FUNCTION update_exchange_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exchange_rates_updated_at ON exchange_rates;
CREATE TRIGGER trg_exchange_rates_updated_at
BEFORE UPDATE ON exchange_rates
FOR EACH ROW
EXECUTE FUNCTION update_exchange_rates_updated_at();
