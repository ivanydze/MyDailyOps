# 🧪 Запуск тестов безопасности

## Проблема с `pnpm exec tsx`

Если возникает ошибка `Cannot find module 'tsx'`, используйте один из вариантов ниже:

### Вариант 1: Использовать npx (рекомендуется)

```powershell
cd apps\desktop
npx tsx test-security-api.ts "ivanydze@gmail.com" "London2010" "info@pavels.lv" "q1w2e3" "https://kmnxcbgzxcbfgfyufasu.supabase.co" "your-supabase-key"
```

### Вариант 2: Запустить батник

```powershell
cd apps\desktop
.\RUN_TEST.bat "ivanydze@gmail.com" "London2010" "info@pavels.lv" "q1w2e3" "https://kmnxcbgzxcbfgfyufasu.supabase.co" "your-supabase-key"
```

### Вариант 3: Использовать pnpm из корня проекта

```powershell
cd C:\Dev\MyDailyOps
pnpm --filter @mydailyops/desktop exec tsx apps/desktop/test-security-api.ts "ivanydze@gmail.com" "London2010" "info@pavels.lv" "q1w2e3" "https://kmnxcbgzxcbfgfyufasu.supabase.co" "your-supabase-key"
```

### Вариант 4: Установить tsx глобально

```powershell
npm install -g tsx
cd apps\desktop
tsx test-security-api.ts "ivanydze@gmail.com" "London2010" "info@pavels.lv" "q1w2e3" "https://kmnxcbgzxcbfgfyufasu.supabase.co" "your-supabase-key"
```

---

## Формат команды:

```
tsx test-security-api.ts <user1-email> <user1-password> <user2-email> <user2-password> <supabase-url> <supabase-key>
```

Пример:
```
tsx test-security-api.ts "ivanydze@gmail.com" "London2010" "info@pavels.lv" "q1w2e3" "https://kmnxcbgzxcbfgfyufasu.supabase.co" "your-key"
```

