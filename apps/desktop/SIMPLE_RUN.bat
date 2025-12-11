@echo off
cd /d %~dp0
set NODE_PATH=%CD%\node_modules;%CD%\..\..\node_modules;%NODE_PATH%
node ..\..\node_modules\.pnpm\registry.npmjs.org\tsx\4.21.0\node_modules\tsx\dist\cli.mjs test-security-api.ts %*
pause

