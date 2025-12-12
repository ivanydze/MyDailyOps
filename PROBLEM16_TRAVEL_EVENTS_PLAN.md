# Problem 16: Travel Events (Trips) - Implementation Plan

## Overview
Travel Events are simple trip markers that appear in Calendar View only. They don't interfere with tasks and are always saved to history.

## Requirements
- **Fields**: start_date, end_date, name, color
- **NO**: deadlines, completion, duration, recurring
- **Always saved to history**
- **Visible only in Calendar**
- **Does not hide or modify tasks**

## Implementation Phases

### Phase 1: Data Model & Types ✅
- [x] Create `TravelEvent` interface
- [x] Add types to `packages/core` (if needed) or Desktop/Mobile
- [x] Define color palette/schema

### Phase 2: Database Schema
- [ ] Supabase: Create `travel_events` table
- [ ] Desktop SQLite: Add `travel_events` table
- [ ] Mobile SQLite: Add `travel_events` table
- [ ] Migration scripts for existing databases

### Phase 3: CRUD Operations
- [ ] Desktop: `dbTravelEvents.ts` (local DB operations)
- [ ] Mobile: `database/travelEvents.ts` (local DB operations)
- [ ] Supabase: RLS policies for `travel_events`

### Phase 4: Sync Integration
- [ ] Desktop: `syncTravelEvents.ts` (sync service)
- [ ] Mobile: `lib/syncTravelEvents.ts` (sync service)
- [ ] Integrate into main sync flow

### Phase 5: Calendar Utilities Extension
- [ ] Update `DayTaskGroup` to include `travelEvents`
- [ ] Add `getTravelEventsForDateRange()` function
- [ ] Update `useCalendarTasks` hook to fetch travel events
- [ ] Create `mergeTasksAndEvents()` function

### Phase 6: Calendar UI Integration
- [ ] Update `CalendarDayView` to display travel events
- [ ] Update `CalendarWeekView` to display travel events
- [ ] Update `CalendarMonthView` to display travel events
- [ ] Update `CalendarYearView` to show travel event indicators
- [ ] Add visual styling (color bars, icons)

### Phase 7: Create/Edit Screens
- [ ] Desktop: `NewTravelEvent.tsx` screen
- [ ] Desktop: `EditTravelEvent.tsx` screen
- [ ] Mobile: `app/travel-events/add.tsx` screen
- [ ] Mobile: `app/travel-events/edit.tsx` screen
- [ ] Navigation integration

### Phase 8: History Storage
- [ ] Implement history storage logic (save past events)
- [ ] Add history retrieval functions
- [ ] Add history UI (optional - can be Phase 9)

### Phase 9: Tests
- [ ] Unit tests for CRUD operations
- [ ] Unit tests for calendar utilities
- [ ] Integration tests for sync
- [ ] UI component tests

## File Structure

### Desktop
```
apps/desktop/src/
├── types/travelEvent.ts          # Type definitions
├── lib/dbTravelEvents.ts         # Local DB operations
├── services/syncTravelEvents.ts  # Sync service
├── stores/travelEventStore.ts    # Zustand store
├── screens/
│   ├── NewTravelEvent.tsx
│   └── EditTravelEvent.tsx
└── components/calendar/
    └── TravelEventBar.tsx        # Visual component
```

### Mobile
```
apps/mobile/
├── types/travelEvent.ts          # Type definitions
├── database/travelEvents.ts      # Local DB operations
├── lib/syncTravelEvents.ts       # Sync service
├── hooks/useTravelEvent.ts       # React hook
└── app/travel-events/
    ├── add.tsx
    └── edit.tsx
```

### Supabase
```
supabase/migrations/
└── create_travel_events.sql
```

## Integration Points

1. **Calendar View**: Extend `DayTaskGroup` interface (already planned in architecture)
2. **Sync**: Add to main sync flow in `syncService.ts` and `lib/sync.ts`
3. **Navigation**: Add links/buttons to create travel events from Calendar

