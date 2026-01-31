-- ============================================================
-- lecture_notes: RLS 有効化とポリシー（自分のノートのみ操作可能）
-- 「完了にする」が反映されない場合は Supabase SQL Editor で実行
-- ============================================================

-- last_watched_at がない場合のみ実行
ALTER TABLE lecture_notes ADD COLUMN IF NOT EXISTS last_watched_at timestamptz;

ALTER TABLE lecture_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can read own lecture_notes" ON lecture_notes;
CREATE POLICY "users can read own lecture_notes"
  ON lecture_notes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users can insert own lecture_notes" ON lecture_notes;
CREATE POLICY "users can insert own lecture_notes"
  ON lecture_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users can update own lecture_notes" ON lecture_notes;
CREATE POLICY "users can update own lecture_notes"
  ON lecture_notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
