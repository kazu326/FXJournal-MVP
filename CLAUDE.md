# CLAUDE.md

Claude Code がこのリポジトリで作業するとき、毎回最初に参照するファイル。

## Project Overview

This repository is **FX Journal MVP** (`kazu326/FXJournal-MVP`).

**目的: FXトレードの「記録・分析・振り返り」を行う FX Journal アプリ。**

Purpose:
- Record FX trades（トレードの記録）
- Review trading decisions（トレード判断の振り返り）
- Analyze performance and behavior（成績・行動の分析）
- Support learning and continuous improvement（学習と継続的改善の支援）

より正確には、本プロジェクトは「勝つため」ではなく **「退場しないため」** のトレード支援ツールである。
背景・思想は [README.md](./README.md) を参照。

## Governance（最優先の制約）

**この節は他のすべての方針に優先する。**

> **教育が核の時のみ、4者全員（ユーザー / FX業者 / サロン運営者 / アプリ導入クライアント）の利益が整合する**

- 取引回数の増加、業者収益の最大化、解約防止を目的とした個別介入を**最適化対象にしない**
- ユーザーへの介入は、**退場兆候**（過剰取引・ルール違反の連発・見送り規律の欠如・記録途絶）に限定する
- 指標設計・介入設計を含む機能追加の際は、必ず [docs/GOVERNANCE.md](docs/GOVERNANCE.md) を読んでから提案する
- `npm run governance:check`（`scripts/governance-checks.mjs`）と CI (`.github/workflows/governance-checks.yml`) が
  この制約を機械的に検査している。変更時はこれを通すこと。

## 技術スタック（確認済み — 2026-09-17 時点で実リポジトリを検証）

| カテゴリ | 技術 | 状態 |
| --- | --- | --- |
| Language | TypeScript 5.9 | 確定 |
| UI | React 19 + React Router DOM 7 | 確定 |
| ビルドツール | **Vite（`npm:rolldown-vite@7.2.5` に override）** | 確定 |
| スタイリング | TailwindCSS 4.x + `@tailwindcss/vite`, Radix UI, CVA | 確定 |
| 状態管理 | Zustand 5 | 確定 |
| グラフ | Recharts 3 | 確定 |
| Backend / DB / Auth | Supabase（`@supabase/supabase-js` 2.x, Edge Functions） | 確定 |
| Hosting | Vercel（`vercel.json` で SPA rewrite） | 確定 |
| Unit test | Jest 30 + Testing Library（`jest.config.cjs`） | 確定 |
| E2E | Playwright（`playwright.config.ts`, `e2e/`） | 確定 |
| Lint | ESLint 9 flat config（`eslint.config.js`） | 確定 |
| Package manager | **npm**（`package-lock.json` のみ存在） | 確定 |

> **注意 / 初期前提の訂正:**
> セットアップ依頼時の想定は「Next.js」だったが、実リポジトリは **Vite + React SPA** である。
> Next.js は使われていない（`next` 依存なし、`app/` `pages/` ルーティング規約なし、`index.html` + `src/main.tsx` 起点）。
> 本ファイルは実態に合わせて記述している。Next.js への移行意図がある場合は別途明示すること。

### 未確定 / 判断が必要な項目（**暫定**）

以下は実装前に必ず確認し、勝手に確定させない。最小構成の案を提示して判断を仰ぐ。

- **暫定**: `src/` 直下に `page.tsx` / `layout.tsx` / `globals.css` が存在するが、Vite SPA 構成では未使用の可能性が高い。
  Next.js 移行の残骸か意図的なものか要確認。削除・整理は独断で行わない。
- **暫定**: `src/components` / `src/features` / `src/pages` / `src/services` の責務境界が未文書化。
- **暫定**: ルート直下の作業ログ（`jest-output*.txt`, `lint-errors.txt`, `utf8_diff.txt`, `_temp_diff.txt`）が
  コミットされている。`.gitignore` 追加の是非は要確認（今回は触っていない）。
- **暫定**: `supabase/supabase.exe`（CLI バイナリ）がコミットされている。除外の是非は要確認。
- **暫定**: Supabase MCP の書き込み権限を今後開放するかどうか（初期は read-only 固定。下記参照）。

## 主要コマンド

| コマンド | 説明 |
| --- | --- |
| `npm install` | 依存インストール |
| `npm run dev` | 開発サーバー起動（Vite） |
| `npm run build` | `tsc -b && vite build` |
| `npm run preview` | ビルド結果のプレビュー |
| `npm run lint` | ESLint |
| `npm test` | Jest（ユニットテスト） |
| `npm run e2e` | Playwright（E2E） |
| `npm run governance:check` | ガバナンス制約の機械チェック |

## 環境変数

`.env.local` をリポジトリ直下に作成する（`.gitignore` の `*.local` で除外済み）。

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Supabase MCP 用の `SUPABASE_ACCESS_TOKEN` は **アプリの env ではなく OS の環境変数**に置く（下記参照）。

## Supabase Policy

- 本プロジェクトは Supabase MCP を利用する（設定は [.mcp.json](./.mcp.json)）
- プロジェクトスコープ設定を優先する（`--project-ref` で対象を限定）
- 可能な限り read-only から始める（初期設定は `--read-only` 固定）
- 明示的な指示なしに本番データ操作を前提にしない
- スキーマ変更を提案するときは、適用前に意図を説明する
- マイグレーションは `supabase/migrations/` にタイムスタンプ付きで追加する（既存ファイルを書き換えない）
- Edge Functions は `supabase/functions/` 配下。セットアップ手順は [docs/edge-functions-setup.md](docs/edge-functions-setup.md)

### `.mcp.json` の接続手順

1. `.mcp.json` の `<YOUR_SUPABASE_PROJECT_REF>` を実際の project ref に置き換える。
   - 確認方法: Supabase ダッシュボード URL `https://supabase.com/dashboard/project/<project_ref>`、
     または Project Settings → General。
   - 参考: このリポジトリには Supabase CLI がリンクした ref が `supabase/.temp/project-ref` にコミット済み。
2. Supabase の Personal Access Token を発行し、**OS の環境変数** `SUPABASE_ACCESS_TOKEN` に設定する。
   - 発行元: Supabase ダッシュボード → Account → Access Tokens
   - `.mcp.json` はコミットされるため、トークンを直書きしない。
3. Claude Code を再起動し、プロジェクトスコープ MCP サーバーの利用を承認する。

**注意（暫定メモ）**
- `--read-only` は安全側の初期設定。書き込みが必要になった時点で、明示的に合意のうえ外す。
- `.mcp.json` は移植性のため `npx` をそのまま使っている。Windows で起動に失敗する場合は
  `"command": "cmd"` にし、`args` 先頭へ `"/c", "npx"` を足すのが回避策（**暫定** / ローカル限定の変更に留める）。
- MCP サーバーのパッケージ名・フラグは Supabase 側の仕様変更で変わりうる。接続できない場合は公式ドキュメントで最新のフラグ名を確認する。

## Coding Policy

- Read existing files before editing
- Reuse current structure when possible
- Add brief comments only where necessary
- Keep naming explicit and consistent
- Prefer small, reviewable changes
- Prioritize simple and maintainable implementation
- Avoid unnecessary abstraction
- Do not make destructive changes without confirmation
- When requirements are unclear, propose the smallest viable option first
- `.agent/skills/` に既存の作業ガイド（`create_page` / `deploy` / `e2e_test` / `mobile_ui_guidelines` /
  `full_bleed_layout`）がある。該当領域を触る前に読む。

## Git Policy

- Use feature branches for new work（`main` から分岐）
- Keep commits focused by purpose
- Do not rewrite unrelated files
- PR には変更概要、UI 変更ならスクリーンショット、マイグレーション/設定変更の注記を含める（[CONTRIBUTING.md](./CONTRIBUTING.md)）

## 参考ドキュメント

- [README.md](./README.md) — 背景・思想・セットアップ
- [ROADMAP.md](./ROADMAP.md) — 開発ロードマップ
- [CONTRIBUTING.md](./CONTRIBUTING.md) — コントリビュート手順
- [docs/GOVERNANCE.md](docs/GOVERNANCE.md) — **最上位の設計原則**
- [docs/GOVERNANCE_CI.md](docs/GOVERNANCE_CI.md) — ガバナンス CI
- [docs/ANALYSIS_PLATFORM.md](docs/ANALYSIS_PLATFORM.md) — 分析基盤
- [docs/MVP_50_USER_READINESS.md](docs/MVP_50_USER_READINESS.md) — 50ユーザー運用準備

## First Tasks

作業開始時の手順:
1. Inspect the file structure
2. Identify framework and package manager（本ファイルの「技術スタック」と一致するか確認）
3. Confirm Supabase-related files and env usage
4. Check whether CLAUDE.md and .mcp.json are aligned
5. Propose the next smallest implementation step
