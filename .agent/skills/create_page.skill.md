# Create New Page Skill

Description: 新しいページ（ルート）を作成するためのスキル。「〇〇ページを作って」と言われたら発動します。

## Triggers
- 新しいページを作って
- ページ追加
- create page

## Actions
1. **パスの決定**:
   - ユーザーにURLパス（例: `/settings`）とコンポーネント名（例: `SettingsPage`）を確認する（または推論する）。

2. **ファイル作成**:
   - `src/pages/` 配下にコンポーネントファイルを作成する（例: `SettingsPage.tsx`）。
   - UIの雛形（ヘッダーとメインコンテンツ領域を持つ基本的な構造）を記述する。
   - 同時に `src/__tests__/pages/` にテストファイル（例: `SettingsPage.test.tsx`）を作成する。

3. **ルーティング登録**:
   - `src/App.tsx` (または `routes.tsx`) を読み込み、新しいルート定義を追加する。
   - `lazy` import を使用している場合はそれに倣うこと。

4. **確認**:
   - 作成したページへのリンクを一時的にトップページに追加するか提案し、ブラウザで表示確認を促す。
