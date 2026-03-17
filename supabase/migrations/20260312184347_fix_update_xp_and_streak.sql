-- マイグレーション: update_xp_and_streak 関数の修正
-- 問題: RETURNS TABLE で定義した列名 (level, current_xp, login_streak) が
--       UPDATE文内のカラム名と曖昧 (ambiguous) になっていたため、
--       RETURN QUERY SELECT に明示的なエイリアスを付与して修正する。
-- 追加: SLIDE_COMPLETE (+10 XP) のサポート（ENUMへの追加も含む）

-- 1. xp_action_type に SLIDE_COMPLETE を追加（既に存在する場合は無視）
ALTER TYPE public.xp_action_type ADD VALUE IF NOT EXISTS 'SLIDE_COMPLETE';

-- 2. 既存の関数を DROP して再作成（戻り値の曖昧さを解消）
DROP FUNCTION IF EXISTS public.update_xp_and_streak(xp_action_type);

CREATE OR REPLACE FUNCTION public.update_xp_and_streak(p_action xp_action_type)
RETURNS TABLE(
  level        integer,
  current_xp   integer,
  login_streak integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id        uuid    := auth.uid();
  v_today          date    := CURRENT_DATE;
  v_last_login_date date;
  v_login_streak   integer;
  v_current_xp     integer;
  v_level          integer;
  v_xp_delta       integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT
    p.last_login_date,
    p.login_streak,
    p.current_xp,
    p.level
  INTO
    v_last_login_date,
    v_login_streak,
    v_current_xp,
    v_level
  FROM public.profiles p
  WHERE p.user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %', v_user_id;
  END IF;

  -- ログインストリークの更新ロジック
  IF v_last_login_date IS NULL THEN
    v_login_streak := 1;
  ELSIF v_last_login_date = v_today THEN
    NULL; -- 今日すでにログイン済み。ストリーク変更なし
  ELSIF v_last_login_date = v_today - 1 THEN
    v_login_streak := v_login_streak + 1;
  ELSE
    v_login_streak := 1; -- 途切れた
  END IF;

  -- ストリークボーナス
  IF v_login_streak = 3 THEN
    v_xp_delta := v_xp_delta + 2;
  ELSIF v_login_streak = 5 THEN
    v_xp_delta := v_xp_delta + 4;
  END IF;

  -- アクション別 XP 付与
  IF p_action = 'DAILY_LESSON_SKIP' THEN
    v_xp_delta := v_xp_delta + 4;
  ELSIF p_action = 'TRADE_PRE' THEN
    v_xp_delta := v_xp_delta + 3;
  ELSIF p_action = 'TRADE_POST' THEN
    v_xp_delta := v_xp_delta + 3;
  ELSIF p_action = 'WEEKLY_LECTURE_NOTE' THEN
    v_xp_delta := v_xp_delta + 6;
  ELSIF p_action = 'SLIDE_COMPLETE' THEN
    v_xp_delta := v_xp_delta + 10;
  END IF;

  v_current_xp := v_current_xp + v_xp_delta;

  IF v_current_xp < 0 THEN
    v_current_xp := 0;
  END IF;

  v_level := FLOOR(v_current_xp / 100) + 1;

  UPDATE public.profiles p
  SET
    current_xp      = v_current_xp,
    level           = v_level,
    last_login_date = v_today,
    login_streak    = v_login_streak,
    updated_at      = NOW()
  WHERE p.user_id = v_user_id;

  -- エイリアスで明示的に列名を指定することで曖昧さを解消
  RETURN QUERY
  SELECT
    v_level      AS level,
    v_current_xp AS current_xp,
    v_login_streak AS login_streak;
END;
$$;
