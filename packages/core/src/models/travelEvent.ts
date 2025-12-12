/**
 * Travel Event Model
 * 
 * Travel Events represent trips that are displayed in Calendar View.
 * They are simple markers with start/end dates, name, and color.
 * 
 * Key characteristics:
 * - NO deadlines, completion, duration, or recurring
 * - Always saved to history
 * - Visible only in Calendar
 * - Do not interfere with task logic
 */

export interface TravelEvent {
  id: string;
  user_id: string;
  name: string;
  start_date: string;        // ISO date string (YYYY-MM-DD)
  end_date: string;          // ISO date string (YYYY-MM-DD)
  color?: string;            // Hex color code (e.g., "#3B82F6")
  location?: string;         // Optional location name
  created_at: string;        // ISO datetime string
  updated_at: string;        // ISO datetime string
}

/**
 * Create a new TravelEvent object
 */
export function createTravelEvent(
  overrides: Partial<TravelEvent> & { user_id: string; name: string; start_date: string; end_date: string }
): TravelEvent {
  const now = new Date().toISOString();
  
  return {
    id: overrides.id || crypto.randomUUID(),
    user_id: overrides.user_id,
    name: overrides.name,
    start_date: overrides.start_date,
    end_date: overrides.end_date,
    color: overrides.color || '#3B82F6', // Default blue
    location: overrides.location,
    created_at: overrides.created_at || now,
    updated_at: overrides.updated_at || now,
  };
}

/**
 * Default color palette for travel events
 */
export const TRAVEL_EVENT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
] as const;

/**
 * Get a color for a travel event by index (for cycling through colors)
 */
export function getTravelEventColor(index: number): string {
  return TRAVEL_EVENT_COLORS[index % TRAVEL_EVENT_COLORS.length];
}

