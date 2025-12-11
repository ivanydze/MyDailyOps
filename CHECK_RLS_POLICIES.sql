-- ============================================
-- Диагностика RLS политик
-- Выполните этот SQL в Supabase SQL Editor
-- ============================================

-- 1. Проверить, включен ли RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'tasks';

-- Результат должен показать rowsecurity = true

-- 2. Проверить тип поля user_id
SELECT 
  column_name, 
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'user_id';

-- 3. Показать все существующие политики
SELECT 
  policyname,
  cmd as command,
  permissive,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'tasks'
ORDER BY cmd, policyname;

-- Должно быть 4 политики:
-- 1. SELECT - Users can view only their own tasks
-- 2. INSERT - Users can insert only their own tasks
-- 3. UPDATE - Users can update only their own tasks
-- 4. DELETE - Users can delete only their own tasks

-- 4. Проверить, какой тип возвращает auth.uid()
SELECT 
  pg_typeof(auth.uid()) as auth_uid_type,
  auth.uid() as current_user_id;

-- 5. Проверить примеры задач (для отладки)
SELECT 
  id,
  user_id,
  title,
  pg_typeof(user_id) as user_id_type
FROM tasks
LIMIT 5;

