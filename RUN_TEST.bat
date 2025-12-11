@echo off
echo ================================================
echo Security Test for MyDailyOps
echo ================================================
echo.
echo Enter Supabase URL:
set /p SUPABASE_URL="URL: "
echo.
echo Enter Supabase Anon Key:
set /p SUPABASE_KEY="Key: "
echo.
echo Enter User 1 Email:
set /p USER1_EMAIL="Email: "
echo.
echo Enter User 1 Password:
set /p USER1_PASS="Password: "
echo.
echo Enter User 2 Email:
set /p USER2_EMAIL="Email: "
echo.
echo Enter User 2 Password:
set /p USER2_PASS="Password: "
echo.
echo Starting test...
echo.

set VITE_SUPABASE_URL=%SUPABASE_URL%
set VITE_SUPABASE_ANON_KEY=%SUPABASE_KEY%
set TEST_USER1_EMAIL=%USER1_EMAIL%
set TEST_USER1_PASSWORD=%USER1_PASS%
set TEST_USER2_EMAIL=%USER2_EMAIL%
set TEST_USER2_PASSWORD=%USER2_PASS%

npx tsx test-security-api.ts

pause

