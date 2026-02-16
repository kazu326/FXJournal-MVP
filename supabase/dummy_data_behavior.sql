-- 変数設定（実行環境に合わせて調整してください）
DO $$
DECLARE
  v_user_id UUID;
  v_learning_date TIMESTAMPTZ := NOW() - INTERVAL '14 days'; -- 2週間前に学習開始
BEGIN
  -- 1. テストユーザーの確保（既存の 'test_user@example.com' がいればそれを使い、なければ作成）
  -- 注意: auth.users への直接挿入はSupabaseの制約で難しい場合があるため、
  -- 既存のログインユーザーIDを使用するか、アプリからサインアップしたユーザーのIDをここに設定することを推奨します。
  -- ここでは、直近に作成されたユーザーを一人ピックアップしてデータを流し込みます。
  SELECT id INTO v_user_id FROM auth.users ORDER BY created_at DESC LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'ユーザーが見つかりません。アプリでユーザーを作成してから実行してください。';
    RETURN;
  END IF;

  RAISE NOTICE 'Target User ID: %', v_user_id;

  -- 2. 学習履歴（lecture_notes）の作成
  -- これにより first_learning_date が設定されると仮定（admin_learning_progress ビューのロジック依存）
  -- 既にデータがある場合はスキップ
  IF NOT EXISTS (SELECT 1 FROM lecture_notes WHERE user_id = v_user_id) THEN
    INSERT INTO lecture_notes (user_id, lecture_id, completed_at, created_at, updated_at)
    VALUES 
      (v_user_id, 'lecture_001', v_learning_date, v_learning_date, v_learning_date);
    RAISE NOTICE 'Added lecture note to set first_learning_date';
  ELSE
    RAISE NOTICE 'Lecture note already exists';
  END IF;

  -- 3. 学習前のトレード履歴（悪い例：過剰取引）
  -- 1日あたり平均5回程度
  INSERT INTO trade_logs (
    user_id, occurred_at, log_type, gate_trade_count_ok, gate_rr_ok, gate_risk_ok, gate_rule_ok, 
    success_prob, expected_value, post_gate_kept, post_within_hypothesis, created_at
  )
  SELECT
    v_user_id,
    v_learning_date - (i || ' days')::INTERVAL + '10:00:00', -- 学習前の日付
    'valid',
    TRUE, TRUE, TRUE, TRUE, 'mid', 'plus', TRUE, TRUE,
    NOW()
  FROM generate_series(1, 10) AS i -- 10日間
  CROSS JOIN generate_series(1, 5) AS j; -- 各日5回

  RAISE NOTICE 'Added pre-learning trades';


  -- 4. 学習後のトレード履歴（理想的な改善例：週2回制限の遵守）
  -- 過去7日間で2回だけ取引
  INSERT INTO trades (
    user_id, created_at, trade_date, currency_pair, position_type, lot_size, entry_price, exit_price, profit_loss
  )
  SELECT
    v_user_id,
    v_learning_date + (i || ' days')::INTERVAL + '10:00:00',
    (v_learning_date + (i || ' days')::INTERVAL)::DATE,
    'USDJPY',
    'long',
    0.1,
    100.00,
    100.10,
    1000
  FROM generate_series(1, 2) AS i; -- 2日間のみ（週2回）

  RAISE NOTICE 'Added post-learning trades (adhering to weekly limit)';

END $$;
