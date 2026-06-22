# LifeOS - Supabase remote setup (run from repo root in PowerShell)
#
# Prerequisites:
#   1. .env has EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY
#   2. You ran: npm run supabase:login   (browser opens once)
#
# Usage:
#   npm run supabase:login          # once - authenticate CLI
#   npm run supabase:setup          # link + migrations + secrets + deploy

$ErrorActionPreference = "Stop"
$ProjectRef = "uhksxddifcptbzkqklcx"

function Invoke-Supabase {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$SupabaseArgs)
    & npx supabase @SupabaseArgs
    if ($LASTEXITCODE -ne 0) {
        throw "supabase command failed (exit $LASTEXITCODE): $($SupabaseArgs -join ' ')"
    }
}

Write-Host ""
Write-Host "=== Step 1/4: Link project $ProjectRef ===" -ForegroundColor Cyan
Invoke-Supabase link --project-ref $ProjectRef

Write-Host ""
Write-Host "=== Step 2/4: Push database migrations ===" -ForegroundColor Cyan
Invoke-Supabase db push

Write-Host ""
Write-Host "=== Step 3/4: Set Edge Function secrets ===" -ForegroundColor Cyan
Write-Host "Paste keys when prompted. Get keys from Anthropic and OpenAI dashboards."
Write-Host "These are stored ONLY in Supabase - never in .env."
Write-Host ""

$anthropic = Read-Host "ANTHROPIC_API_KEY (sk-ant-...)"
if ([string]::IsNullOrWhiteSpace($anthropic)) {
    throw "ANTHROPIC_API_KEY is required for classify/briefing/chat functions."
}
Invoke-Supabase secrets set "ANTHROPIC_API_KEY=$anthropic"

$openai = Read-Host "OPENAI_API_KEY (sk-proj-... or sk-...)"
if ([string]::IsNullOrWhiteSpace($openai)) {
    throw "OPENAI_API_KEY is required for transcribe-audio."
}
Invoke-Supabase secrets set "OPENAI_API_KEY=$openai"

Write-Host ""
Write-Host "=== Step 4/4: Deploy Edge Functions ===" -ForegroundColor Cyan
$functions = @(
    "classify-entry",
    "morning-briefing",
    "anti-entropy",
    "transcribe-audio",
    "ai-chat"
)
foreach ($fn in $functions) {
    Write-Host "Deploying $fn..." -ForegroundColor Yellow
    Invoke-Supabase functions deploy $fn
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green
Write-Host ""
Write-Host "Manual dashboard steps (one-time):" -ForegroundColor Yellow
Write-Host "  1. Authentication - Providers - enable Email"
Write-Host "  2. Optional: disable email confirmation for personal MVP"
Write-Host "  3. Later: Database - Extensions - enable pg_cron and pg_net for cron jobs"
Write-Host ""
Write-Host "Test the app:" -ForegroundColor Yellow
Write-Host "  npm start"
Write-Host "  Sign up on device, capture text, check Inbox"
Write-Host ""
