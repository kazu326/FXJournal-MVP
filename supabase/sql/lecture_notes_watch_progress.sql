-- ============================================================
-- lecture_notes: 視聴進捗・完了日時・ユニーク制約
-- ============================================================

ALTER TABLE lecture_notes ADD COLUMN IF NOT EXISTS watch_progress integer DEFAULT 0;
COMMENT ON COLUMN lecture_notes.watch_progress IS '視聴進捗（0〜100%）';

ALTER TABLE lecture_notes ADD COLUMN IF NOT EXISTS completed_at timestamptz;
COMMENT ON COLUMN lecture_notes.completed_at IS '講座完了日時';

-- 1ユーザー・1講座あたり1行にしたい場合はユニーク制約を追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lecture_notes_user_id_lecture_id_key'
  ) THEN
    ALTER TABLE lecture_notes
    ADD CONSTRAINT lecture_notes_user_id_lecture_id_key UNIQUE (user_id, lecture_id);
  END IF;
END $$;
