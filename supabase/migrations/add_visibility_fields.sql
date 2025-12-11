-- Migration: Add visibility fields for Problem 5 (Deadline-anchored duration)
-- Date: 2025-01-10
-- Description: 
--   1. Adds start_date field (for tasks without deadline)
--   2. Adds duration_days, visible_from, and visible_until fields to tasks table
--   3. Performs backfill: calculates visibility for all existing tasks
-- 
-- Formula for tasks WITH deadline:
--   visible_from = deadline - (duration_days - 1)
--   visible_until = deadline
-- 
-- Formula for tasks WITHOUT deadline:
--   visible_from = start_date
--   visible_until = start_date + (duration_days - 1)

BEGIN;

-- ============================================
-- STEP 1: Add columns
-- ============================================

DO $$ 
BEGIN
  -- Add start_date (for tasks without deadline)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='start_date') THEN
    ALTER TABLE tasks ADD COLUMN start_date DATE;
    RAISE NOTICE 'Added column: start_date';
  END IF;

  -- Add duration_days (nullable initially, will be backfilled)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='duration_days') THEN
    ALTER TABLE tasks ADD COLUMN duration_days INTEGER;
    RAISE NOTICE 'Added column: duration_days';
  END IF;

  -- Add visible_from (DATE format for proper date operations)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='visible_from') THEN
    ALTER TABLE tasks ADD COLUMN visible_from DATE;
    RAISE NOTICE 'Added column: visible_from';
  END IF;

  -- Add visible_until (DATE format for proper date operations)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='visible_until') THEN
    ALTER TABLE tasks ADD COLUMN visible_until DATE;
    RAISE NOTICE 'Added column: visible_until';
  END IF;
END $$;

-- ============================================
-- STEP 2: Backfill - Set start_date for legacy tasks without deadline
-- ============================================

-- For tasks without deadline and without start_date, set start_date = created_at (fallback for legacy data)
-- This is only for backfill - future tasks should always have start_date set explicitly
UPDATE tasks
SET start_date = created_at::date
WHERE 
  deadline IS NULL 
  AND start_date IS NULL 
  AND created_at IS NOT NULL;

-- ============================================
-- STEP 3: Backfill - Set duration_days = 1
-- ============================================

UPDATE tasks
SET duration_days = 1
WHERE duration_days IS NULL;

-- ============================================
-- STEP 4: Backfill - Calculate visibility for tasks WITH deadline
-- ============================================

UPDATE tasks
SET 
  visible_from = (deadline::date - INTERVAL '1 day' * (COALESCE(duration_days, 1) - 1)),
  visible_until = deadline::date
WHERE 
  deadline IS NOT NULL
  AND (visible_from IS NULL OR visible_until IS NULL);

-- ============================================
-- STEP 5: Backfill - Calculate visibility for tasks WITHOUT deadline
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
-- STEP 6: Add indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date);
CREATE INDEX IF NOT EXISTS idx_tasks_visible_from ON tasks(visible_from);
CREATE INDEX IF NOT EXISTS idx_tasks_visible_until ON tasks(visible_until);
CREATE INDEX IF NOT EXISTS idx_tasks_duration_days ON tasks(duration_days);

-- ============================================
-- STEP 7: Add comments
-- ============================================

COMMENT ON COLUMN tasks.start_date IS 'Start date for tasks without deadline. Used to calculate visible_from and visible_until for non-deadline tasks.';
COMMENT ON COLUMN tasks.duration_days IS 'Number of days the task should be visible. Default: 1. Used to calculate visible_from and visible_until.';
COMMENT ON COLUMN tasks.visible_from IS 'First date when task becomes visible. For tasks with deadline: deadline - (duration_days - 1). For tasks without deadline: start_date.';
COMMENT ON COLUMN tasks.visible_until IS 'Last date when task is visible. For tasks with deadline: deadline. For tasks without deadline: start_date + (duration_days - 1).';

COMMIT;

