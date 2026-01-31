-- 初回ログイン時のオンボーディングツアー用フラグ
-- profiles テーブルに onboarding_completed を追加（本プロジェクトは profiles でユーザー情報を管理）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- ※ auth.users や別の users テーブルを使う場合は以下も実行してください：
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
