-- Migration: Add event_time and event_timezone fields for Problem 17 (Timezone-Safe Task Time)
-- Date: 2025-01-XX
-- Description: 
--   Adds event_time (TIME) and event_timezone (TEXT) fields to tasks table
--   These fields allow tasks to store a specific time in a specific timezone
--   without automatic timezone conversion (timezone-safe)

BEGIN;

-- ============================================
-- STEP 1: Add columns
-- ============================================

DO $$ 
BEGIN
  -- Add event_time (TIME format for time-only storage)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='event_time') THEN
    ALTER TABLE tasks ADD COLUMN event_time TIME;
    RAISE NOTICE 'Added column: event_time';
  END IF;

  -- Add event_timezone (TEXT for IANA timezone identifier, e.g., "Europe/London")
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='event_timezone') THEN
    ALTER TABLE tasks ADD COLUMN event_timezone TEXT;
    RAISE NOTICE 'Added column: event_timezone';
  END IF;
END $$;

-- ============================================
-- STEP 2: Add indexes
-- ============================================

-- Index for event_time (only on non-null values)
CREATE INDEX IF NOT EXISTS idx_tasks_event_time 
ON tasks(event_time) 
WHERE event_time IS NOT NULL;

COMMENT ON COLUMN tasks.event_time IS 'Time of the event (HH:mm format). Stored without date component. Never auto-converts when timezone changes.';
COMMENT ON COLUMN tasks.event_timezone IS 'IANA timezone identifier (e.g., "Europe/London", "America/New_York"). Determines which timezone the event_time is in.';

COMMIT;

