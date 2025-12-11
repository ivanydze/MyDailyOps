# 🎯 ФИНАЛЬНЫЕ ИНСТРУКЦИИ ДЛЯ ЗАПУСКА ТЕСТОВ

## Самый простой способ - используйте этот скрипт в PowerShell:

```powershell
cd C:\Dev\MyDailyOps\apps\desktop

# Установите tsx локально в этой папке (если еще не установлен)
pnpm install

# Затем запустите через node напрямую (обходной путь для монорепо)
$env:NODE_PATH = "$PWD\node_modules;$PWD\..\..\node_modules"
node ../../node_modules/.pnpm/registry.npmjs.org/tsx/4.21.0/node_modules/tsx/dist/cli.mjs test-security-api.ts "ivanydze@gmail.com" "London2010" "info@pavels.lv" "q1w2e3" "https://kmnxcbgzxcbfgfyufasu.supabase.co" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbnhjYmd6eGNiZmdmeXVmYXN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDY1NzA5NSwiZXhwIjoyMDgwMjMzMDk1fQ.JnPJtkyBypI5Br0CmHHPoqWarfU-WhW208AES9W76io"
```

Или еще проще - используйте готовый батник из корня проекта `RUN_SECURITY_TEST.bat`

---

## Альтернатива: Используйте скрипт из package.json

После того как вы окажетесь в папке `apps/desktop`:

```powershell
pnpm test:security -- "ivanydze@gmail.com" "London2010" "info@pavels.lv" "q1w2e3" "https://kmnxcbgzxcbfgfyufasu.supabase.co" "ваш-ключ"
```

Но для этого нужно убедиться, что tsx работает через pnpm exec.

