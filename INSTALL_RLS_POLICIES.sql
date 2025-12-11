-- ============================================
-- УСТАНОВКА RLS ПОЛИТИК ДЛЯ ТАБЛИЦЫ TASKS
-- ============================================
-- Выполните этот SQL в Supabase SQL Editor
-- ============================================

-- Шаг 1: Включить Row Level Security (если еще не включен)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Шаг 2: Создать политику SELECT (чтение задач)
-- Пользователи могут видеть только свои задачи
CREATE POLICY "Users can view only their own tasks"
ON tasks
FOR SELECT
USING (auth.uid()::text = user_id);

-- Шаг 3: Создать политику INSERT (создание задач)
-- Пользователи могут создавать только задачи со своим user_id
CREATE POLICY "Users can insert only their own tasks"
ON tasks
FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- Шаг 4: Создать политику UPDATE (обновление задач)
-- Пользователи могут обновлять только свои задачи
CREATE POLICY "Users can update only their own tasks"
ON tasks
FOR UPDATE
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- Шаг 5: Создать политику DELETE (удаление задач)
-- Пользователи могут удалять только свои задачи
CREATE POLICY "Users can delete only their own tasks"
ON tasks
FOR DELETE
USING (auth.uid()::text = user_id);

-- Шаг 6: Проверить установленные политики
SELECT 
  policyname,
  cmd as command,
  permissive,
  roles
FROM pg_policies
WHERE tablename = 'tasks'
ORDER BY cmd, policyname;

-- Должно быть 4 политики:
-- 1. SELECT - Users can view only their own tasks
-- 2. INSERT - Users can insert only their own tasks
-- 3. UPDATE - Users can update only their own tasks
-- 4. DELETE - Users can delete only their own tasks

-- ============================================
-- ГОТОВО! Теперь запустите тесты безопасности
-- ============================================

