-- ============================================
-- УСТАНОВКА RLS ПОЛИТИК (ВАРИАНТ ДЛЯ UUID)
-- ============================================
-- Используйте ЭТОТ вариант, если user_id имеет тип UUID
-- Проверьте тип: SELECT data_type FROM information_schema.columns 
--                WHERE table_name = 'tasks' AND column_name = 'user_id';
-- ============================================

-- Шаг 1: Включить Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Шаг 2: Создать политику SELECT
CREATE POLICY "Users can view only their own tasks"
ON tasks
FOR SELECT
USING (auth.uid() = user_id::uuid);

-- Шаг 3: Создать политику INSERT
CREATE POLICY "Users can insert only their own tasks"
ON tasks
FOR INSERT
WITH CHECK (auth.uid() = user_id::uuid);

-- Шаг 4: Создать политику UPDATE
CREATE POLICY "Users can update only their own tasks"
ON tasks
FOR UPDATE
USING (auth.uid() = user_id::uuid)
WITH CHECK (auth.uid() = user_id::uuid);

-- Шаг 5: Создать политику DELETE
CREATE POLICY "Users can delete only their own tasks"
ON tasks
FOR DELETE
USING (auth.uid() = user_id::uuid);

-- Шаг 6: Проверить
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'tasks' ORDER BY cmd;

