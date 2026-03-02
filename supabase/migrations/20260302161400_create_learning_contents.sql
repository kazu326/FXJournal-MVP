-- 学習コンテンツ用テーブル作成

-- 1. スライドモジュール用テーブル
CREATE TABLE IF NOT EXISTS public.learning_slides_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    image_urls TEXT[] NOT NULL DEFAULT '{}',
    reward_xp INTEGER NOT NULL DEFAULT 10,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- RLS設定 (slides)
ALTER TABLE public.learning_slides_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "公開済みのスライドモジュールは誰でも閲覧可能" 
    ON public.learning_slides_modules
    FOR SELECT 
    TO authenticated 
    USING (is_published = true);

-- 管理者権限（必要に応じて。既存のteacher/adminロール等があれば調整）
-- 今回はテスト用・簡易実装のため、フルアクセスはひとまず保留し、INSERT等はダッシュボードまたはシードデータで行う想定

-- 2. 動画一覧用テーブル
CREATE TABLE IF NOT EXISTS public.learning_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    youtube_url TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    reward_xp INTEGER NOT NULL DEFAULT 10,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- RLS設定 (videos)
ALTER TABLE public.learning_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "公開済みの動画一覧は誰でも閲覧可能" 
    ON public.learning_videos
    FOR SELECT 
    TO authenticated 
    USING (is_published = true);

-- 3. 学習進捗用テーブル (XP付与等の記録用)
CREATE TABLE IF NOT EXISTS public.learning_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('slide', 'video')),
    content_id UUID NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    xp_rewarded INTEGER NOT NULL DEFAULT 0,
    -- 同じコンテンツを複数回完了してXPを二重取得するのを防ぐ
    UNIQUE(user_id, content_type, content_id)
);

-- RLS設定 (progress)
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ユーザーは自身の進捗のみ閲覧可能"
    ON public.learning_progress
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "ユーザーは自身の進捗を新規登録可能"
    ON public.learning_progress
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 更新トリガー用関数 (updated_at) の設定等が必要であれば追加
