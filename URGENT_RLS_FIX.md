# 🚨 СРОЧНО: Исправление RLS политик

## ❌ Проблема

Тесты показывают, что **RLS не блокирует DELETE и UPDATE операции!**

Это означает, что политики для DELETE и UPDATE либо:
- Не созданы
- Созданы неправильно
- Не работают из-за неправильного приведения типов

---

## 🔍 Шаг 1: Диагностика

Выполните SQL в Supabase SQL Editor (файл `CHECK_RLS_POLICIES.sql`):

```sql
-- Проверить, какие политики существуют
SELECT 
  policyname,
  cmd as command
FROM pg_policies
WHERE tablename = 'tasks'
ORDER BY cmd;
```

**Ожидаемый результат:** Должно быть 4 политики:
1. SELECT
2. INSERT  
3. **UPDATE** ← Должна быть!
4. **DELETE** ← Должна быть!

Если UPDATE или DELETE отсутствуют - **это проблема!**

---

## 🔧 Шаг 2: Исправление

### Вариант A: Если политики отсутствуют

Выполните SQL из файла `FIX_RLS_COMPLETE.sql` в Supabase SQL Editor.

**Важно:** Сначала проверьте тип поля `user_id`:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'user_id';
```

### Вариант B: Если политики есть, но не работают

Возможно, проблема в приведении типов. Попробуйте:

```sql
-- Удалить существующие политики
DROP POLICY IF EXISTS "Users can update only their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete only their own tasks" ON tasks;

-- Создать заново с явным приведением типов
-- Вариант 1: Если user_id - TEXT
CREATE POLICY "Users can update only their own tasks"
ON tasks FOR UPDATE
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete only their own tasks"
ON tasks FOR DELETE
USING (auth.uid()::text = user_id);

-- Вариант 2: Если user_id - UUID
-- CREATE POLICY "Users can update only their own tasks"
-- ON tasks FOR UPDATE
-- USING (auth.uid() = user_id::uuid)
-- WITH CHECK (auth.uid() = user_id::uuid);
--
-- CREATE POLICY "Users can delete only their own tasks"
-- ON tasks FOR DELETE
-- USING (auth.uid() = user_id::uuid);
```

---

## 🧪 Шаг 3: Проверка

После исправления запустите тесты снова:

```powershell
.\RUN_SECURITY_TEST.bat
```

**Ожидаемый результат:** Все 9 тестов должны пройти ✅

---

## 📋 Быстрая команда (если user_id - TEXT)

Скопируйте и выполните в Supabase SQL Editor:

```sql
-- Удалить проблемные политики
DROP POLICY IF EXISTS "Users can update only their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete only their own tasks" ON tasks;

-- Создать правильные политики
CREATE POLICY "Users can update only their own tasks"
ON tasks FOR UPDATE
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete only their own tasks"
ON tasks FOR DELETE
USING (auth.uid()::text = user_id);

-- Проверить
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'tasks';
```

---

## ⚠️ Важно

После исправления политик **обязательно запустите тесты снова**, чтобы убедиться, что все работает!

