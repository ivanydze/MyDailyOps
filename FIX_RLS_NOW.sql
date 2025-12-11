-- ============================================
-- КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: RLS политики для DELETE и UPDATE
-- ============================================
-- Выполните этот SQL в Supabase SQL Editor
-- ============================================

-- Шаг 1: Проверить тип поля user_id
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'user_id';

-- Шаг 2: Удалить существующие политики (если есть проблемы)
DROP POLICY IF EXISTS "Users can delete only their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update only their own tasks" ON tasks;

-- Шаг 3: Создать правильные политики
-- ВАРИАНТ A: Если user_id имеет тип TEXT (обычно для Supabase Auth)
-- Этот вариант работает в большинстве случаев!

CREATE POLICY "Users can delete only their own tasks"
ON tasks
FOR DELETE
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update only their own tasks"
ON tasks
FOR UPDATE
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- ВАРИАНТ B: Если user_id имеет тип UUID (раскомментируйте, если нужно)
-- CREATE POLICY "Users can delete only their own tasks"
-- ON tasks
-- FOR DELETE
-- USING (auth.uid() = user_id::uuid);
--
-- CREATE POLICY "Users can update only their own tasks"
-- ON tasks
-- FOR UPDATE
-- USING (auth.uid() = user_id::uuid)
-- WITH CHECK (auth.uid() = user_id::uuid);

-- Шаг 4: Проверить все политики
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'tasks'
ORDER BY cmd, policyname;

-- Вы должны увидеть 4 политики:
-- 1. SELECT - Users can view only their own tasks
-- 2. INSERT - Users can insert only their own tasks
-- 3. UPDATE - Users can update only their own tasks ← ДОЛЖНА БЫТЬ!
-- 4. DELETE - Users can delete only their own tasks ← ДОЛЖНА БЫТЬ!

