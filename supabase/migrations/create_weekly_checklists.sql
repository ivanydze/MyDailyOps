-- Migration: Create weekly_checklists table for Problem 10
-- Date: 2025-01-XX
-- Description: 
--   Creates weekly_checklists table for storing weekly checklist instances
--   Each checklist exists for one week and is saved in history
--   Items are stored as JSONB array

BEGIN;

-- ============================================
-- STEP 1: Create weekly_checklists table
-- ============================================

CREATE TABLE IF NOT EXISTS weekly_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,  -- First day of week (Sunday or Monday)
  week_end_date DATE NOT NULL,    -- Last day of week
  title TEXT,                      -- Optional checklist title
  items JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array of checklist items
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One checklist per week per user
  CONSTRAINT unique_user_week UNIQUE(user_id, week_start_date)
);

-- ============================================
-- STEP 2: Create indexes for performance
-- ============================================

-- Index for finding current week checklist
CREATE INDEX IF NOT EXISTS idx_weekly_checklists_user_week 
  ON weekly_checklists(user_id, week_start_date);

-- Index for history queries (ordered by week)
CREATE INDEX IF NOT EXISTS idx_weekly_checklists_user_week_desc 
  ON weekly_checklists(user_id, week_start_date DESC);

-- ============================================
-- STEP 3: Add Row Level Security (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE weekly_checklists ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own checklists
CREATE POLICY "Users can view own weekly checklists"
  ON weekly_checklists
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own checklists
CREATE POLICY "Users can insert own weekly checklists"
  ON weekly_checklists
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own checklists
CREATE POLICY "Users can update own weekly checklists"
  ON weekly_checklists
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own checklists
CREATE POLICY "Users can delete own weekly checklists"
  ON weekly_checklists
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- STEP 4: Create trigger for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_weekly_checklists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_weekly_checklists_updated_at
  BEFORE UPDATE ON weekly_checklists
  FOR EACH ROW
  EXECUTE FUNCTION update_weekly_checklists_updated_at();

COMMIT;

-- ============================================
-- NOTES:
-- ============================================
-- Items JSONB structure:
-- [
--   {
--     "id": "uuid",
--     "text": "Check item text",
--     "completed": false,
--     "created_at": "2025-01-15T10:00:00Z"
--   }
-- ]
--
-- Week boundaries:
-- - week_start_date: First day of week (typically Sunday or Monday)
-- - week_end_date: Last day of week (Saturday or Sunday)
-- - Week detection logic is handled in application code
-- - Default: Sunday = first day (weekStartsOn = 0)

