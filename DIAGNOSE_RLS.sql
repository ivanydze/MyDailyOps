-- ============================================
-- ДИАГНОСТИКА RLS - Проверка почему политики не работают
-- ============================================

-- 1. Проверить, включен ли RLS
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'tasks';

-- Должно быть: rls_enabled = true

-- 2. Проверить все политики и их выражения
SELECT 
  policyname,
  cmd as command,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE tablename = 'tasks'
ORDER BY cmd;

-- 3. Проверить тип user_id
SELECT 
  column_name, 
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'user_id';

-- 4. Проверить тип auth.uid()
SELECT 
  pg_typeof(auth.uid()) as auth_uid_type;

-- 5. Тестовый запрос - проверить, работает ли сравнение
-- Замените 'YOUR_USER_ID_HERE' на реальный user_id из таблицы tasks
SELECT 
  auth.uid() as current_auth_uid,
  auth.uid()::text as auth_uid_as_text,
  'YOUR_USER_ID_HERE' as sample_user_id,
  auth.uid()::text = 'YOUR_USER_ID_HERE' as comparison_result,
  (SELECT user_id FROM tasks LIMIT 1) as first_task_user_id,
  auth.uid()::text = (SELECT user_id FROM tasks LIMIT 1) as matches_first_task;

-- 6. Проверить, может ли текущий пользователь видеть задачи
-- (выполните, будучи залогиненным в Supabase)
SELECT 
  COUNT(*) as visible_tasks,
  COUNT(*) FILTER (WHERE auth.uid()::text = user_id) as own_tasks,
  COUNT(*) FILTER (WHERE auth.uid()::text != user_id) as other_tasks
FROM tasks;

-- Если other_tasks > 0, значит RLS для SELECT не работает!
-- Если own_tasks = 0 и вы залогинены, значит есть проблема с auth.uid()

-- 7. Проверить структуру политик детально
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'tasks';

