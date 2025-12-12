-- Migration: Add deleted_at field to tasks table for soft delete (Problem 13)
-- This enables "Delete All Tasks" functionality with Trash/restore capability

-- Add deleted_at column (nullable, defaults to NULL for existing rows)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index for performance when filtering by deleted_at
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);

-- Add comment to document the field
COMMENT ON COLUMN tasks.deleted_at IS 'Soft delete timestamp. NULL means task is active. Non-NULL means task is in Trash.';

