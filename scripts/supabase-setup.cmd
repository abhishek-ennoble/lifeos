@echo off
setlocal
cd /d "%~dp0.."

echo.
echo === Step 1/4: Link project uhksxddifcptbzkqklcx ===
call npx supabase link --project-ref uhksxddifcptbzkqklcx
if errorlevel 1 exit /b 1

echo.
echo === Step 2/4: Push database migrations ===
call npx supabase db push
if errorlevel 1 exit /b 1

echo.
echo === Step 3/4: Set Edge Function secrets ===
echo Paste keys when prompted. Stored in Supabase only - never in .env.
echo.
set /p ANTHROPIC_KEY=ANTHROPIC_API_KEY (sk-ant-...): 
if "%ANTHROPIC_KEY%"=="" (
  echo ANTHROPIC_API_KEY is required.
  exit /b 1
)
call npx supabase secrets set ANTHROPIC_API_KEY=%ANTHROPIC_KEY%
if errorlevel 1 exit /b 1

set /p OPENAI_KEY=OPENAI_API_KEY (sk-proj-... or sk-...): 
if "%OPENAI_KEY%"=="" (
  echo OPENAI_API_KEY is required.
  exit /b 1
)
call npx supabase secrets set OPENAI_API_KEY=%OPENAI_KEY%
if errorlevel 1 exit /b 1

echo.
echo === Step 4/4: Deploy Edge Functions ===
for %%F in (classify-entry morning-briefing anti-entropy transcribe-audio ai-chat) do (
  echo Deploying %%F...
  call npx supabase functions deploy %%F
  if errorlevel 1 exit /b 1
)

echo.
echo === Done ===
echo.
echo Manual dashboard steps:
echo   1. Authentication - Providers - enable Email
echo   2. Optional: disable email confirmation for personal MVP
echo.
echo Test: npm start - sign up on device, capture text, check Inbox
echo.
endlocal
