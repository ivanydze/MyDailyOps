-- ============================================
-- ПОЛНОЕ ИСПРАВЛЕНИЕ RLS ПОЛИТИК
-- ============================================
-- Выполните этот SQL в Supabase SQL Editor
-- ============================================

-- ШАГ 1: Включить RLS (если еще не включен)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- ШАГ 2: Удалить ВСЕ существующие политики (для чистоты)
DROP POLICY IF EXISTS "Users can view only their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert only their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update only their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete only their own tasks" ON tasks;

-- ШАГ 3: Проверить тип user_id
-- Выполните отдельно и посмотрите результат:
SELECT 
  column_name, 
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'user_id';

-- ШАГ 4A: Создать политики (ВАРИАНТ для TEXT типа user_id)
-- Используйте этот вариант, если user_id имеет тип TEXT или VARCHAR

CREATE POLICY "Users can view only their own tasks"
ON tasks FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert only their own tasks"
ON tasks FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update only their own tasks"
ON tasks FOR UPDATE
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete only their own tasks"
ON tasks FOR DELETE
USING (auth.uid()::text = user_id);

-- ШАГ 4B: Создать политики (ВАРИАНТ для UUID типа user_id)
-- Раскомментируйте и используйте, если user_id имеет тип UUID
-- Закомментируйте ШАГ 4A перед использованием!

-- CREATE POLICY "Users can view only their own tasks"
-- ON tasks FOR SELECT
-- USING (auth.uid() = user_id::uuid);
--
-- CREATE POLICY "Users can insert only their own tasks"
-- ON tasks FOR INSERT
-- WITH CHECK (auth.uid() = user_id::uuid);
--
-- CREATE POLICY "Users can update only their own tasks"
-- ON tasks FOR UPDATE
-- USING (auth.uid() = user_id::uuid)
-- WITH CHECK (auth.uid() = user_id::uuid);
--
-- CREATE POLICY "Users can delete only their own tasks"
-- ON tasks FOR DELETE
-- USING (auth.uid() = user_id::uuid);

-- ШАГ 5: Проверить результат
SELECT 
  policyname,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'tasks'
ORDER BY cmd, policyname;

-- Должно быть 4 политики с правильными выражениями!

