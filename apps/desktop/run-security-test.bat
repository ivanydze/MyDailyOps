@echo off
cd /d %~dp0
call node_modules\.bin\tsx.cmd test-security-api.ts %*
if errorlevel 1 pause

