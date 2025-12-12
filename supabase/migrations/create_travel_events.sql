-- Create travel_events table for Problem 16: Travel Events (Trips)
-- Travel events are simple trip markers displayed in Calendar View only

BEGIN;

-- Create travel_events table
CREATE TABLE IF NOT EXISTS travel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  color TEXT DEFAULT '#3B82F6', -- Default blue color
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT travel_events_end_date_after_start CHECK (end_date >= start_date),
  CONSTRAINT travel_events_valid_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$' OR color = '')
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_travel_events_user_id ON travel_events(user_id);

-- Create index on date range for calendar queries
CREATE INDEX IF NOT EXISTS idx_travel_events_dates ON travel_events(start_date, end_date);

-- Create index on user_id + date range for user-specific calendar queries
CREATE INDEX IF NOT EXISTS idx_travel_events_user_dates ON travel_events(user_id, start_date, end_date);

-- Enable Row Level Security (RLS)
ALTER TABLE travel_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own travel events
CREATE POLICY "Users can view own travel events"
  ON travel_events
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- RLS Policy: Users can insert their own travel events
CREATE POLICY "Users can insert own travel events"
  ON travel_events
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- RLS Policy: Users can update their own travel events
CREATE POLICY "Users can update own travel events"
  ON travel_events
  FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- RLS Policy: Users can delete their own travel events
CREATE POLICY "Users can delete own travel events"
  ON travel_events
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_travel_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on row update
CREATE TRIGGER travel_events_updated_at
  BEFORE UPDATE ON travel_events
  FOR EACH ROW
  EXECUTE FUNCTION update_travel_events_updated_at();

COMMIT;

