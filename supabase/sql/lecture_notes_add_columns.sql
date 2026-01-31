-- lecture_notes: add missing columns (fix PGRST204)
-- Run in Supabase SQL Editor. Schema cache is reloaded at the end.

ALTER TABLE lecture_notes ADD COLUMN IF NOT EXISTS watch_progress integer DEFAULT 0;
ALTER TABLE lecture_notes ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE lecture_notes ADD COLUMN IF NOT EXISTS last_watched_at timestamptz;

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

-- PostgREST のスキーマキャッシュを更新（新しいカラムを API に反映）
NOTIFY pgrst, 'reload schema';
