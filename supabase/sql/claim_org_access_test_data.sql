-- claim-org-access Edge Function の手動テスト用データ
-- Edge Function は public.users.discord_id / pending_org_owners / pending_org_staff を参照します。
--
-- スキーマ（想定）:
--   pending_org_owners: discord_user_id, org_name, claimed_at
--   pending_org_staff:  discord_user_id, owner_discord_id, role, claimed_at
--   users:              id (auth.users 連携), discord_id
--
-- テスト手順:
-- 1) 先生（Owner）用: pending_org_owners に自分の discord_id を追加
-- 2) Discord OAuth でログイン → claim-org-access が organization を自動作成
-- 3) 管理担当（Staff）用: pending_org_staff に discord_user_id=自分のdiscord_id, owner_discord_id=先生のdiscord_id, role を追加
-- 4) 管理担当がログイン（先生ログイン後）→ claim-org-access が org_staff を自動作成

-- 例: 先生（Owner）の登録（discord_id は Discord のユーザーID）
-- INSERT INTO pending_org_owners (discord_user_id, org_name)
-- VALUES ('673174270754422784', 'My FX School')
-- ON CONFLICT (discord_user_id) DO NOTHING;

-- 例: 管理担当（Staff）の登録（owner_discord_id は先生の Discord ID）
-- INSERT INTO pending_org_staff (discord_user_id, owner_discord_id, role)
-- VALUES
--   ('923010741001420800', '673174270754422784', 'member'),
--   ('別のdiscord_id', '673174270754422784', 'admin')
-- ON CONFLICT (discord_user_id) DO NOTHING;

-- ※ 実際のテーブル名・カラムはプロジェクトのマイグレーションに合わせてください。
-- ※ public.users に discord_id が入るのは Discord OAuth ログイン時などで同期される想定です。
