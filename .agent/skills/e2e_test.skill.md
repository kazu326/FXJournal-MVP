# E2E Test Skill (Playwright Script Ver.)

Description: Playwrightのテストスクリプトを作成・実行して、E2Eテストを行うスキル。

## Triggers
- E2Eテスト
- ブラウザテストして
- 動作確認して

## Actions
1. **テストコード作成**:
   - ユーザーの要望（例：「ログインできるか確認」）に基づいて、Playwrightのテストコードを `e2e/temp_test.spec.ts` に作成する。
   - `test` 関数を使い、`await page.goto('http://localhost:5173')` から始めること。
   - ※重要: `headless: true` (画面を出さないモード) で実行する設定にするか、ユーザーに見せるなら `headless: false` を指定する。

2. **実行**:
   - `npx playwright test e2e/temp_test.spec.ts` を実行する。
   - 実行結果（コンソール出力）を確認する。

3. **報告**:
   - テストがPASSしたかFAILしたかを報告する。
   - FAILした場合は、エラーログを元にテストコードかアプリコードの修正案を出す。
