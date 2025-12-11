-- ⚡ ПОЛНАЯ МИГРАЦИЯ С BACKFILL: Поля видимости для Problem 5
-- Скопируйте этот SQL и выполните в Supabase SQL Editor
-- 
-- ⚠️ ВАЖНО: Выполните это ПЕРЕД использованием новых функций в приложениях!
-- 
-- Что делает миграция:
-- 1. Добавляет поле start_date (для задач без deadline)
-- 2. Добавляет поля: duration_days, visible_from, visible_until
-- 3. Устанавливает start_date = created_at для legacy задач без deadline (backfill fallback)
-- 4. Устанавливает duration_days = 1 для всех существующих задач
-- 5. Рассчитывает visible_from/visible_until для всех существующих задач:
--    - С deadline: visible_from = deadline - (duration_days - 1), visible_until = deadline
--    - Без deadline: visible_from = start_date, visible_until = start_date + (duration_days - 1)

BEGIN;

-- ============================================
-- ШАГ 1: Добавление колонок
-- ============================================

DO $$ 
BEGIN
  -- start_date (для задач без deadline)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='start_date') THEN
    ALTER TABLE tasks ADD COLUMN start_date DATE;
    RAISE NOTICE '✅ Added column: start_date';
  END IF;

  -- duration_days
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='duration_days') THEN
    ALTER TABLE tasks ADD COLUMN duration_days INTEGER;
    RAISE NOTICE '✅ Added column: duration_days';
  END IF;

  -- visible_from
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='visible_from') THEN
    ALTER TABLE tasks ADD COLUMN visible_from DATE;
    RAISE NOTICE '✅ Added column: visible_from';
  END IF;

  -- visible_until
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='visible_until') THEN
    ALTER TABLE tasks ADD COLUMN visible_until DATE;
    RAISE NOTICE '✅ Added column: visible_until';
  END IF;
END $$;

-- ============================================
-- ШАГ 2: Backfill - Установка start_date для legacy задач
-- ============================================

UPDATE tasks
SET start_date = created_at::date
WHERE 
  deadline IS NULL 
  AND start_date IS NULL 
  AND created_at IS NOT NULL;

-- ============================================
-- ШАГ 3: Backfill - Установка duration_days = 1
-- ============================================

UPDATE tasks
SET duration_days = 1
WHERE duration_days IS NULL;

-- ============================================
-- ШАГ 4: Backfill - Расчет видимости для задач С deadline
-- ============================================

UPDATE tasks
SET 
  visible_from = (deadline::date - INTERVAL '1 day' * (COALESCE(duration_days, 1) - 1)),
  visible_until = deadline::date
WHERE 
  deadline IS NOT NULL
  AND (visible_from IS NULL OR visible_until IS NULL);

-- ============================================
-- ШАГ 5: Backfill - Расчет видимости для задач БЕЗ deadline
-- ============================================

UPDATE tasks
SET 
  visible_from = start_date,
  visible_until = (start_date + INTERVAL '1 day' * (COALESCE(duration_days, 1) - 1))
WHERE 
  deadline IS NULL
  AND start_date IS NOT NULL
  AND (visible_from IS NULL OR visible_until IS NULL);

-- ============================================
-- ШАГ 6: Индексы для производительности
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date);
CREATE INDEX IF NOT EXISTS idx_tasks_visible_from ON tasks(visible_from);
CREATE INDEX IF NOT EXISTS idx_tasks_visible_until ON tasks(visible_until);
CREATE INDEX IF NOT EXISTS idx_tasks_duration_days ON tasks(duration_days);

-- ============================================
-- ШАГ 7: Проверка результата
-- ============================================

SELECT 
  'Migration Summary' as info,
  COUNT(*) as total_tasks,
  COUNT(CASE WHEN deadline IS NOT NULL THEN 1 END) as tasks_with_deadline,
  COUNT(CASE WHEN deadline IS NULL THEN 1 END) as tasks_without_deadline,
  COUNT(duration_days) as tasks_with_duration,
  COUNT(visible_from) as tasks_with_visible_from,
  COUNT(visible_until) as tasks_with_visible_until,
  COUNT(CASE WHEN deadline IS NOT NULL AND visible_from IS NOT NULL THEN 1 END) as deadline_tasks_calculated,
  COUNT(CASE WHEN deadline IS NULL AND start_date IS NOT NULL AND visible_from IS NOT NULL THEN 1 END) as no_deadline_tasks_calculated
FROM tasks;

COMMIT;

-- ✅ Миграция завершена!
-- Все существующие задачи теперь имеют:
-- - start_date (для задач без deadline, fallback на created_at для legacy)
-- - duration_days = 1
-- - Рассчитанные visible_from/visible_until по правильным формулам
