# 🚀 Быстрый тест безопасности

## Самый простой способ:

### 1. Запустите команду с данными (одна строка):

**Windows (PowerShell):**
```powershell
$env:VITE_SUPABASE_URL="ваш-url"; $env:VITE_SUPABASE_ANON_KEY="ваш-key"; $env:TEST_USER1_EMAIL="user1@email.com"; $env:TEST_USER1_PASSWORD="pass1"; $env:TEST_USER2_EMAIL="user2@email.com"; $env:TEST_USER2_PASSWORD="pass2"; npx tsx test-security-api.ts
```

**Linux/Mac:**
```bash
VITE_SUPABASE_URL="ваш-url" VITE_SUPABASE_ANON_KEY="ваш-key" TEST_USER1_EMAIL="user1@email.com" TEST_USER1_PASSWORD="pass1" TEST_USER2_EMAIL="user2@email.com" TEST_USER2_PASSWORD="pass2" npx tsx test-security-api.ts
```

### 2. Или создайте `.env.test` файл (проще):

Создайте файл `.env.test` в корне проекта:

```
VITE_SUPABASE_URL=https://ваш-проект.supabase.co
VITE_SUPABASE_ANON_KEY=ваш-anon-key
TEST_USER1_EMAIL=user1@email.com
TEST_USER1_PASSWORD=password1
TEST_USER2_EMAIL=user2@email.com
TEST_USER2_PASSWORD=password2
```

Затем запустите:
```bash
# Windows
$env:NODE_ENV="test"; Get-Content .env.test | ForEach-Object { if($_ -match '^([^=]+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process") } }; npx tsx test-security-api.ts

# Linux/Mac
export $(cat .env.test | xargs) && npx tsx test-security-api.ts
```

### 3. Самый простой - через аргументы:

```bash
npx tsx test-security-api.ts "user1@email.com" "pass1" "user2@email.com" "pass2"
```

Но тогда нужно установить Supabase URL и Key через переменные окружения или модифицировать скрипт.

---

## 📋 Что нужно предоставить:

1. **Supabase URL** - из вашего Supabase проекта
2. **Supabase Anon Key** - из Settings → API
3. **Email пользователя 1** и **пароль**
4. **Email пользователя 2** и **пароль**

---

## ✅ После запуска:

Скопируйте весь вывод команды и пришлите мне - я проанализирую результаты!

