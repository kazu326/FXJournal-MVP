#!/usr/bin/env bash
# Edge Functions セットアップ（確認→無ければ作る・あれば作らない）
# プロジェクトルートで実行: bash scripts/setup-edge-functions.sh

set -e
PROJECT_REF="loqnkhgyhhnnzwpomtpt"

echo "--- 手順0: 状態確認 ---"
if [ ! -d "supabase" ]; then
  echo "supabase/ がありません -> ルートA（作る）"
  echo "1) supabase init ..."
  npx supabase@latest init
  echo "2) link --project-ref $PROJECT_REF ..."
  npx supabase@latest link --project-ref "$PROJECT_REF"
  if [ ! -d "supabase/functions/claim-org-access" ]; then
    echo "3) functions new claim-org-access ..."
    npx supabase@latest functions new claim-org-access
  fi
else
  echo "supabase/ があります -> ルートB"
  if [ ! -f "supabase/config.toml" ]; then
    echo "config.toml がありません。init と link を実行します。"
    npx supabase@latest init
    npx supabase@latest link --project-ref "$PROJECT_REF"
  fi
  if [ ! -f "supabase/functions/claim-org-access/index.ts" ]; then
    echo "claim-org-access がありません。functions new ..."
    npx supabase@latest functions new claim-org-access
  else
    echo "claim-org-access は既にあります。"
  fi
fi

echo ""
echo "--- 共通: このあと手動で実行 ---"
echo "1. supabase/.env.local を作成し、SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY を設定"
echo "2. npx supabase@latest secrets set --env-file supabase/.env.local"
echo "3. npx supabase@latest functions deploy claim-org-access"
echo ""
