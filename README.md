# FX Journal MVP

FXトレード学習・日誌管理アプリケーション。トレード前後のGate判定記録、講義ノート視聴、進捗管理機能を提供します。

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | React 19 + TypeScript |
| ビルドツール | Vite (rolldown-vite) |
| スタイリング | TailwindCSS 4.x |
| ルーティング | React Router DOM 7.x |
| バックエンド | Supabase（認証、DB、Edge Functions） |
| ホスティング | Vercel |
| アイコン | Lucide React |
| 通知 | react-hot-toast |

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルをプロジェクトルートに作成し、以下を設定：

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

## スクリプト

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run preview` | ビルド結果のプレビュー |
| `npm run lint` | ESLintによるコード検査 |

## ディレクトリ構造

```
src/
├── App.tsx           # メインアプリケーション
├── main.tsx          # エントリーポイント
├── components/       # 再利用可能なUIコンポーネント
├── contexts/         # Reactコンテキスト（認証等）
├── layouts/          # ページレイアウト
├── lib/              # ユーティリティ・Supabaseクライアント
├── pages/            # ページコンポーネント
├── types/            # TypeScript型定義
├── ui/               # UIラベル、コピーテキスト
└── styles/           # グローバルスタイル

supabase/
├── functions/        # Edge Functions
└── sql/              # SQLマイグレーション
```

## 主要機能

- **Gate判定記録**: トレード前の4つのGate（取引回数、RR、リスク、ルール）をチェック
- **取引ログ**: 取引前後の記録・振り返り
- **講義ノート**: 動画講義の視聴・進捗管理
- **管理者ダッシュボード**: レビューキュー、リスク管理、メンバー設定
- **PWA対応**: オフライン対応、ホーム画面追加

## デプロイ

Vercelにデプロイ済み。`vercel.json`でSPAリライト設定を適用。
