# Edge Functions セットアップ手順（1分で確認→実行）

「確認して、無ければ作る・あれば作らない」を迷わず実行する手順です。**プロジェクトルート（package.json がある階層）で実行してください。**

---

## Cursor で一括実行（おすすめ）

プロジェクトルートで次を実行すると、状態に応じて「無ければ作る・あれば作らない」を自動で行います。

- **Windows（PowerShell）**
  ```powershell
  .\scripts\setup-edge-functions.ps1
  ```
- **Mac / Linux（bash）**
  ```bash
  bash scripts/setup-edge-functions.sh
  ```

実行後は **共通：Secrets をセット** と **共通：デプロイ** を手動で行ってください。

---

## 手順0：どっちの状態か確認（1コマンド）

```bash
ls -la supabase
```

- **`supabase/` が無い** → **ルートA** へ
- **`supabase/` があって `supabase/functions/` がある** → **ルートB** へ

（Windows PowerShell の場合は `Get-ChildItem supabase`）

---

## ルートA：supabase/ が無い場合（作る）

### 1) Supabase CLI 初期化

```bash
npx supabase@latest init
```

### 2) 本番プロジェクトにリンク（project-ref を指定）

```bash
npx supabase@latest link --project-ref loqnkhgyhhnnzwpomtpt
```

### 3) 関数を作る

```bash
npx supabase@latest functions new claim-org-access
```

→ `supabase/functions/claim-org-access/index.ts` ができます。**中身を次の「共通：コードを貼る場所」のコードで上書き保存してください。**

---

## ルートB：すでに supabase/functions/ がある場合（作らない）

- **claim-org-access が既にある**（`supabase/functions/claim-org-access/index.ts` がある）  
  → 何もしない。**共通** の Secrets・デプロイへ進む。
- **別の関数だけ追加したいとき**

  ```bash
  npx supabase@latest functions new <関数名>
  ```

  作成された `index.ts` にコードを貼り付けて保存。

- **supabase/ はあるが config.toml が無い**（まだ `supabase init` していない）  
  → ルートA の 1) と 2) だけ実行してから **共通** へ。

---

## 共通：コードを貼る場所

`supabase/functions/claim-org-access/index.ts` に、以下と同じ内容が入っていることを確認してください。  
（既にリポジトリに含まれている場合はそのままでOKです。）

- 中身は `supabase/functions/claim-org-access/index.ts` を開いて確認・必要なら上書き。

---

## 共通：Secrets をセット（必須）

Supabase の [Dashboard](https://supabase.com/dashboard) → **Project Settings** → **API** で以下をコピーします。

1. **supabase/.env.local** を作成し、以下を入れる（`...` を実際の値に置き換え）：

```text
SUPABASE_URL=https://loqnkhgyhhnnzwpomtpt.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

※ `SUPABASE_SERVICE_ROLE_KEY` はクライアントに絶対出さないこと。

2. ローカルの .env.local を Supabase の secrets に反映：

```bash
npx supabase@latest secrets set --env-file supabase/.env.local
```

※ 先に `npx supabase@latest link --project-ref loqnkhgyhhnnzwpomtpt` が完了している必要があります。

---

## 共通：デプロイ

```bash
npx supabase@latest functions deploy claim-org-access
```

---

## 共通：動作確認（アプリから）

ログイン後に **1回** 呼ばれればOKです。**既に AuthContext で実装済み**です。

```ts
await supabase.functions.invoke('claim-org-access', { body: {} });
```

→ ログインすると自動で実行されます。手動で試す場合はブラウザコンソールなどで上記を実行してください。

---

## クイックチェックリスト

| 項目 | コマンド / 確認 |
|------|------------------|
| 0. 状態確認 | `ls -la supabase` |
| A. 初期化（supabase が無いとき） | `npx supabase@latest init` |
| A. リンク | `npx supabase@latest link --project-ref loqnkhgyhhnnzwpomtpt` |
| A/B. 関数作成（無いとき） | `npx supabase@latest functions new claim-org-access` |
| 共通. Secrets | `supabase/.env.local` を作成 → `npx supabase@latest secrets set --env-file supabase/.env.local` |
| 共通. デプロイ | `npx supabase@latest functions deploy claim-org-access` |
