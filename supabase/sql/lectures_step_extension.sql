-- ============================================================
-- lectures テーブル拡張: STEP制カリキュラム対応
-- ============================================================

-- 1. カラム追加（1文ずつ実行）
ALTER TABLE lectures ADD COLUMN IF NOT EXISTS step_number integer;
COMMENT ON COLUMN lectures.step_number IS 'ステップ番号（1=マインド, 2=基礎, 3=実践）';

ALTER TABLE lectures ADD COLUMN IF NOT EXISTS order_in_step integer;
COMMENT ON COLUMN lectures.order_in_step IS 'ステップ内の順序';

ALTER TABLE lectures ADD COLUMN IF NOT EXISTS content_type text;
COMMENT ON COLUMN lectures.content_type IS 'コンテンツ種別（video / article / pdf）';

ALTER TABLE lectures ADD COLUMN IF NOT EXISTS youtube_video_id text;
COMMENT ON COLUMN lectures.youtube_video_id IS 'YouTube動画ID';

ALTER TABLE lectures ADD COLUMN IF NOT EXISTS external_url text;
COMMENT ON COLUMN lectures.external_url IS '外部リンク（note、Google Driveなど）';

ALTER TABLE lectures ADD COLUMN IF NOT EXISTS duration_minutes integer;
COMMENT ON COLUMN lectures.duration_minutes IS '所要時間（分）';

ALTER TABLE lectures ADD COLUMN IF NOT EXISTS is_required boolean DEFAULT true;
COMMENT ON COLUMN lectures.is_required IS '必須講座かどうか';

ALTER TABLE lectures ADD COLUMN IF NOT EXISTS key_points text[];
COMMENT ON COLUMN lectures.key_points IS '講座の要点（配列）';

-- 2. 初期データ投入（16講座）
INSERT INTO lectures (
  title,
  lecture_date,
  video_url,
  description,
  step_number,
  order_in_step,
  content_type,
  youtube_video_id,
  external_url,
  duration_minutes,
  is_required,
  key_points
) VALUES
-- STEP 1: マインドセット（4件）
(
  '損切りができない理由を知ろう',
  CURRENT_DATE,
  'https://www.youtube.com/watch?v=XrBaNg_eXGk',
  '人はなぜ損切ができないのか?エントリー本数を減らす重要性を解説',
  1,
  1,
  'video',
  'XrBaNg_eXGk',
  NULL,
  5,
  true,
  ARRAY['損切りは悪ではない', 'エントリー本数を減らす', 'メンタル管理の重要性']
),
(
  'トレーダーの心得：メンタルとの向き合い方',
  CURRENT_DATE,
  NULL,
  NULL,
  1,
  2,
  'article',
  NULL,
  'https://note.com/preview/nbab12e90469b?prev_access_key=23e3f9fb0811bf6da68e85d5efb05395',
  15,
  true,
  ARRAY['メンタル管理の重要性', '感情に左右されないルール作り', '長期的な成功のための思考法']
),
(
  '1回で無くなっていい金額とは？',
  CURRENT_DATE,
  'https://www.youtube.com/watch?v=KDfSspiEDYg',
  NULL,
  1,
  3,
  'video',
  'KDfSspiEDYg',
  NULL,
  5,
  true,
  ARRAY['資金管理の基本', '1回のリスクは2%まで', '損失を最小化する思考']
),
(
  '仕事しながら意識する、時間帯別立ち回り',
  CURRENT_DATE,
  'https://www.youtube.com/watch?v=-64XxK5R0_c',
  NULL,
  1,
  4,
  'video',
  '-64XxK5R0_c',
  NULL,
  5,
  false,
  ARRAY['東京時間の特徴', 'ロンドン時間の値動き', 'NY時間の注意点']
),

-- STEP 2: FX基礎知識（6件）
(
  'ローソク足とは',
  CURRENT_DATE,
  'https://www.youtube.com/watch?v=X_1hQeM8bXk',
  'トレードの基本となるローソク足の読み方を学ぶ',
  2,
  1,
  'video',
  'X_1hQeM8bXk',
  NULL,
  5,
  true,
  ARRAY['ローソク足の構造', '高値・安値・始値・終値', '陽線と陰線の違い']
),
(
  'ローソク足の種類',
  CURRENT_DATE,
  'https://www.youtube.com/watch?v=ZBvQ8i_SOp8',
  'ローソク足の種類とそれぞれの意味を理解する',
  2,
  2,
  'video',
  'ZBvQ8i_SOp8',
  NULL,
  5,
  true,
  ARRAY['大陽線・大陰線', '十字線の意味', '上ヒゲ・下ヒゲの読み方']
),
(
  'FX投資入門：初心者向け完全ガイド',
  CURRENT_DATE,
  NULL,
  NULL,
  2,
  3,
  'pdf',
  NULL,
  'https://drive.google.com/file/d/1FQSOsC04X77gYyjVm3Kh7MSnIwpQNALX/view?usp=drive_link',
  10,
  true,
  ARRAY['FXの基本的な仕組み', '取引の流れ', '初心者が知るべき用語']
),
(
  'LotとPipsを理解しよう',
  CURRENT_DATE,
  NULL,
  NULL,
  2,
  4,
  'pdf',
  NULL,
  'https://drive.google.com/file/d/1dMQ79qgXrZarMvJIwRRNM6KmOMbEVQxO/view?usp=drive_link',
  10,
  true,
  ARRAY['Lotの計算方法', 'Pipsとは何か', '損益の計算方法']
),
(
  'チャート分析の基礎',
  CURRENT_DATE,
  NULL,
  NULL,
  2,
  5,
  'pdf',
  NULL,
  'https://drive.google.com/file/d/1Uf67LTtNzizzkoNNIOYgvKZo8IoaWEJ6/view?usp=sharing',
  10,
  true,
  ARRAY['チャートの種類', 'トレンドの見方', 'サポート・レジスタンス']
),
(
  'テクニカル分析入門',
  CURRENT_DATE,
  NULL,
  NULL,
  2,
  6,
  'pdf',
  NULL,
  'https://drive.google.com/file/d/1eI7M76O6hnV6wGj7Ghlt-YbSCk9nh_aX/view?usp=sharing',
  10,
  true,
  ARRAY['移動平均線の使い方', 'オシレーター指標', 'エントリーシグナル']
),

-- STEP 3: 実践スキル（6件）
(
  '三大マーケットについて',
  CURRENT_DATE,
  'https://www.youtube.com/watch?v=k5lywIIRXYM',
  '東京・ロンドン・ニューヨーク市場の特徴と立ち回り',
  3,
  1,
  'video',
  'k5lywIIRXYM',
  NULL,
  5,
  false,
  ARRAY['東京時間の特徴', 'ロンドン時間の値動き', 'NY時間の注意点']
),
(
  'ローソク足組み合わせ1',
  CURRENT_DATE,
  'https://www.youtube.com/watch?v=f5ogI9Xq754',
  'ローソク足の組み合わせパターンを学ぶ（前編）',
  3,
  2,
  'video',
  'f5ogI9Xq754',
  NULL,
  5,
  false,
  ARRAY['包み足の見方', 'はらみ足のパターン', '反転サインの見極め']
),
(
  'ローソク足組み合わせ2',
  CURRENT_DATE,
  'https://www.youtube.com/watch?v=vLuAY8QDq6A',
  NULL,
  3,
  3,
  'video',
  'vLuAY8QDq6A',
  NULL,
  5,
  false,
  ARRAY['包み足の応用', 'はらみ足の実践', '反転パターンの見極め']
),
(
  'エントリーの考え方とトレード戦略',
  CURRENT_DATE,
  'https://www.youtube.com/watch?v=PSS69BFjeTo',
  NULL,
  3,
  4,
  'video',
  'PSS69BFjeTo',
  NULL,
  10,
  true,
  ARRAY['エントリーポイントの判断', 'リスクリワード比', '勝率より期待値']
);

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE 'lectures テーブルの拡張が完了しました。16件の講座を追加しました。';
END $$;
