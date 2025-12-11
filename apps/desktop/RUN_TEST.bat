@echo off
cd /d %~dp0
pnpm --filter @mydailyops/desktop exec tsx test-security-api.ts %*
pause
