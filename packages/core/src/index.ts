// Export all public APIs
// Export shared types (main Task type matching Supabase schema)
export * from "./models/shared";

// Export task utilities (but not conflicting Task type)
export { createTask, normalizeTask } from "./models/task";
export type { RecurringType } from "./models/task";

// Export travel event utilities
export { createTravelEvent, getTravelEventColor, TRAVEL_EVENT_COLORS } from "./models/travelEvent";
export type { TravelEvent } from "./models/travelEvent";

// Export utils
export * from "./utils";
