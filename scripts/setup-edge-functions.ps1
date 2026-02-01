# Edge Functions セットアップ（確認→無ければ作る・あれば作らない）
# プロジェクトルートで実行: .\scripts\setup-edge-functions.ps1

$ErrorActionPreference = "Stop"
$projectRef = "loqnkhgyhhnnzwpomtpt"

Write-Host "--- 手順0: 状態確認 ---" -ForegroundColor Cyan
if (-not (Test-Path "supabase")) {
  Write-Host "supabase/ がありません -> ルートA（作る）" -ForegroundColor Yellow
  Write-Host "1) supabase init ..." -ForegroundColor Gray
  npx supabase@latest init
  Write-Host "2) link --project-ref $projectRef ..." -ForegroundColor Gray
  npx supabase@latest link --project-ref $projectRef
  if (-not (Test-Path "supabase\functions\claim-org-access")) {
    Write-Host "3) functions new claim-org-access ..." -ForegroundColor Gray
    npx supabase@latest functions new claim-org-access
  }
} else {
  Write-Host "supabase/ があります -> ルートB" -ForegroundColor Green
  if (-not (Test-Path "supabase\config.toml")) {
    Write-Host "config.toml がありません。init と link を実行します。" -ForegroundColor Yellow
    npx supabase@latest init
    npx supabase@latest link --project-ref $projectRef
  }
  if (-not (Test-Path "supabase\functions\claim-org-access\index.ts")) {
    Write-Host "claim-org-access がありません。functions new ..." -ForegroundColor Gray
    npx supabase@latest functions new claim-org-access
  } else {
    Write-Host "claim-org-access は既にあります。" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "--- 共通: このあと手動で実行 ---" -ForegroundColor Cyan
Write-Host "1. supabase/.env.local を作成し、SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY を設定"
Write-Host "2. npx supabase@latest secrets set --env-file supabase/.env.local"
Write-Host "3. npx supabase@latest functions deploy claim-org-access"
Write-Host ""
