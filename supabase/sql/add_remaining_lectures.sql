-- ============================================================
-- 残り11講座のみを追加（既に5講座が投入済みの場合に実行）
-- Supabase SQL Editor で実行可能
-- ============================================================

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
-- STEP 1: マインドセット（3件）
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
-- STEP 2: FX基礎知識（4件）
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
-- STEP 3: 実践スキル（2件）
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
