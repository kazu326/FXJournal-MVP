# 30〜50人向けMVP運用チェック

最終更新: 2026-07-30（JST）

## 結論

30〜50人という利用人数は、現在のデータ量とSupabase Freeプランの容量上限に対して十分小さい。公開前の主な注意点は負荷ではなく、認証メール、バックアップ、権限設定、migration運用である。

本番URL:

- アプリ: <https://fx-journal-mvp.vercel.app/>
- Supabase project ref: `loqnkhgyhhnnzwpomtpt`
- Region: `ap-northeast-1`

## 2026-07-30時点の本番スナップショット

| 項目 | 現在値 | 判定 |
|---|---:|---|
| Authユーザー | 6人 | 30〜50人への増加に余裕あり |
| Database | 約17MB / 500MB | 約3.3% |
| Storage | 約117MB / 1GB | 約11.7% |
| DB接続 | 16 / 60 | 現時点で余裕あり |
| Edge Function | `push-notification` v17、`create-monthly-checkins` v1 | 稼働中 |
| 月次チェックインcron | 毎月1日 00:05 JST相当 | 稼働確認済み |
| Supabase plan | Free | 下記「公開前に決めること」を参照 |

Supabaseの現在のFreeプラン上限は、[公式料金ページ](https://supabase.com/pricing)を正とする。

## 今回完了した本番対応

- Supabase AuthのSite URLを `http://localhost:5173/` から本番URLへ変更。
- Discordログイン用の本番リダイレクトURLが許可済みであることを確認。
- 新規ユーザーはDiscord、既存のメール連携ユーザーだけメールOTPを使う表示と挙動へ整理。
- 管理画面が使用する `interventions.trigger_type` とENUMを本番へ反映。
- 内部用・trigger用のSECURITY DEFINER関数を匿名または一般ユーザーが直接実行できないように変更。
- XP更新とPush購読保存RPCは、認証済みユーザーだけ実行可能なまま維持。
- 学習コンテンツStorageの匿名一覧取得を閉鎖。既存の公開ファイルURLは維持。
- Push購読情報の匿名読み取りを閉鎖。本人用RLSだけに集約。
- リポジトリと本番のmigration履歴を整合させ、通常の `supabase db push --dry-run` が `up to date` になることを確認。

## 公開前に決めること

### 1. 新規登録方法

カスタムSMTPは未設定。Supabaseの既定メール送信は本番の一般ユーザー登録には使わない。

当面のMVP運用:

- 新規ユーザーには「Discordでログイン」を案内する。
- 既存のメール連携ユーザーは、登録済みメールでOTPログインできる。
- メール経由の新規アカウントは作成しない。

メール新規登録も提供する場合は、[Supabase Custom SMTPの手順](https://supabase.com/docs/guides/auth/auth-smtp)に沿って、Resend、Postmark、SESなどの送信元ドメインと認証情報を設定する。設定後は実在アドレスへの到達確認、迷惑メール判定、送信制限の確認まで行う。

### 2. Freeプラン継続かPro移行か

人数・容量だけならFreeで開始できる。ただし、[本番チェックリスト](https://supabase.com/docs/guides/deployment/going-into-prod)にある通り、Freeプロジェクトには一時停止やバックアップ面の制約がある。

- 短期間のMVP検証: Freeでも開始可能。
- 継続利用、復旧保証、停止回避を重視: ユーザー招待前にPro移行を推奨。

プラン変更は課金を伴うため、運営者がSupabase Dashboardで決定する。

## ユーザー招待前の確認

1. 本PRをmainへマージし、Vercel Production deploymentがSuccessになることを確認。
2. 390px幅でログイン、ホーム、履歴、講義、メッセージ、マイページを確認。
3. Discordの新規ユーザー1名でログインし、`/auth/callback` からホームへ戻ることを確認。
4. 取引前記録、見送り、取引後記録を各1回保存。
5. メッセージ画面で一斉通知、月次チェックイン、相談導線を確認。
6. 管理画面で介入登録を1件テストし、`trigger_type` が保存されることを確認。
7. Push通知を使う場合は、購読登録とテスト通知を対応端末で確認。

## 週次運用

- Supabase Database AdvisorsのSecurity警告を確認。
- Edge Functionの5xxとcron実行結果を確認。
- DB容量、Storage容量、接続数を確認。
- 未完了の月次チェックインと相談スレッドを管理画面で確認。
- 新しいmigrationは `supabase migration new <name>` で作り、`supabase db push --linked --dry-run` 後に適用する。

## 障害時

- UIの不具合: Vercelで直前の成功deploymentへ戻す。
- DB変更: 過去migrationを書き換えず、打ち消す新規migrationを作る。
- 認証障害: まずDiscord provider、Site URL、Redirect URL、Auth logsを確認。
- 通知障害: `push-notification` logs、購読件数、無効endpointの削除結果を確認。
