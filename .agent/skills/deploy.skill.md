# Deploy Skill

Description: このプロジェクトのデプロイ手順を定義します。「デプロイして」と言われたらこの手順を厳守してください。

## Triggers
- デプロイして
- 本番環境に反映して
- deploy

## Actions
1. **Lint & Test**:
   - `npm run lint` を実行し、エラーがないか確認する。
   - `npm run test` を実行し、全てのテストが通ることを確認する。
   - エラーがあれば即座に中止し、詳細を報告すること。

2. **Build**:
   - `npm run build` を実行する。
   - ビルドエラーが出た場合は修正案を提示して停止する。

3. **Deploy**:
   - (SupabaseやVercelなど、ご自身の環境に合わせて書いてください)
   - 例: `vercel --prod` を実行する。
   - 完了後、デプロイ先のURLを表示して、ブラウザで開くか確認する。
