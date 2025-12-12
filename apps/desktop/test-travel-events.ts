/**
 * Travel Events Tests
 * 
 * Tests for Problem 16: Travel Events (Trips)
 * 
 * Tests verify:
 * 1. Calendar utilities (date overlap, date range filtering)
 * 2. Travel Event model functions (createTravelEvent, getTravelEventColor)
 * 3. History functions (past, future, current, by year)
 * 
 * Usage:
 *   tsx test-travel-events.ts
 */

import { parseISO, startOfDay, addDays, subDays } from 'date-fns';
import type { TravelEvent } from '@mydailyops/core';
import { createTravelEvent, TRAVEL_EVENT_COLORS, getTravelEventColor } from '@mydailyops/core';
import {
  doesTravelEventOverlapDate,
  getTravelEventsForDateRange,
} from './src/utils/calendar';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

interface TestResult {
  testNumber: number;
  name: string;
  passed: boolean;
  message: string;
  expected?: any;
  actual?: any;
}

const results: TestResult[] = [];
let testCounter = 0;

// Helper functions
function test(name: string, fn: () => void) {
  testCounter++;
  try {
    fn();
    const result: TestResult = {
      testNumber: testCounter,
      name,
      passed: true,
      message: '✅ PASSED',
    };
    results.push(result);
    console.log(`✅ Test ${testCounter}: ${name}`);
  } catch (error: any) {
    const result: TestResult = {
      testNumber: testCounter,
      name,
      passed: false,
      message: `❌ FAILED: ${error.message}`,
      expected: error.expected,
      actual: error.actual,
    };
    results.push(result);
    console.log(`❌ Test ${testCounter}: ${name} - ${error.message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    const error: any = new Error(message);
    throw error;
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    const error: any = new Error(message || `Expected ${expected}, got ${actual}`);
    error.expected = expected;
    error.actual = actual;
    throw error;
  }
}

function assertNotNull<T>(value: T | null | undefined, message?: string) {
  if (value === null || value === undefined) {
    const error: any = new Error(message || 'Value should not be null or undefined');
    throw error;
  }
}

// ============================================================================
// SECTION 1: Travel Event Model (createTravelEvent, getTravelEventColor)
// ============================================================================

console.log('\n=== SECTION 1: Travel Event Model ===\n');

// Test 1.1: createTravelEvent creates valid event
test('1.1: createTravelEvent creates valid event', () => {
  const event = createTravelEvent({
    user_id: 'user-123',
    name: 'Trip to Paris',
    start_date: '2024-06-01',
    end_date: '2024-06-05',
    color: '#FF0000',
    location: 'Paris, France',
  });

  assertEqual(event.user_id, 'user-123');
  assertEqual(event.name, 'Trip to Paris');
  assertEqual(event.start_date, '2024-06-01');
  assertEqual(event.end_date, '2024-06-05');
  assertEqual(event.color, '#FF0000');
  assertEqual(event.location, 'Paris, France');
  assertNotNull(event.id);
  assertNotNull(event.created_at);
  assertNotNull(event.updated_at);
});

// Test 1.2: createTravelEvent generates UUID
test('1.2: createTravelEvent generates UUID', () => {
  const event1 = createTravelEvent({
    user_id: 'user-123',
    name: 'Event 1',
    start_date: '2024-06-01',
    end_date: '2024-06-05',
  });

  const event2 = createTravelEvent({
    user_id: 'user-123',
    name: 'Event 2',
    start_date: '2024-07-01',
    end_date: '2024-07-05',
  });

  assert(event1.id !== event2.id, 'Events should have different IDs');
  assert(event1.id.length > 0, 'ID should not be empty');
  assert(event2.id.length > 0, 'ID should not be empty');
});

// Test 1.3: createTravelEvent uses default color if not provided
test('1.3: createTravelEvent uses default color if not provided', () => {
  const event = createTravelEvent({
    user_id: 'user-123',
    name: 'Trip',
    start_date: '2024-06-01',
    end_date: '2024-06-05',
  });

  assertEqual(event.color, '#3B82F6'); // Default blue
});

// Test 1.4: createTravelEvent handles optional location
test('1.4: createTravelEvent handles optional location', () => {
  const eventWithLocation = createTravelEvent({
    user_id: 'user-123',
    name: 'Trip',
    start_date: '2024-06-01',
    end_date: '2024-06-05',
    location: 'Paris',
  });

  const eventWithoutLocation = createTravelEvent({
    user_id: 'user-123',
    name: 'Trip',
    start_date: '2024-06-01',
    end_date: '2024-06-05',
  });

  assertEqual(eventWithLocation.location, 'Paris');
  assert(eventWithoutLocation.location === undefined, 'Location should be undefined if not provided');
});

// Test 1.5: getTravelEventColor returns valid color
test('1.5: getTravelEventColor returns valid color', () => {
  const color = getTravelEventColor(0);
  assert(TRAVEL_EVENT_COLORS.includes(color), `Color ${color} should be in TRAVEL_EVENT_COLORS`);
});

// Test 1.6: getTravelEventColor cycles through colors
test('1.6: getTravelEventColor cycles through colors', () => {
  const color0 = getTravelEventColor(0);
  const color8 = getTravelEventColor(8);
  const color16 = getTravelEventColor(16);

  // Should cycle back
  assertEqual(color0, color8, 'Colors should cycle every 8');
  assertEqual(color0, color16, 'Colors should cycle every 16');
});

// ============================================================================
// SECTION 2: Calendar Utilities - doesTravelEventOverlapDate
// ============================================================================

console.log('\n=== SECTION 2: doesTravelEventOverlapDate() ===\n');

// Test 2.1: Event overlaps on start date
test('2.1: Event overlaps on start date', () => {
  const event: TravelEvent = {
    id: 'event-1',
    user_id: 'user-123',
    name: 'Trip',
    start_date: '2024-06-01',
    end_date: '2024-06-05',
    color: '#FF0000',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const checkDate = parseISO('2024-06-01');
  assert(doesTravelEventOverlapDate(event, checkDate), 'Event should overlap on start date');
});

// Test 2.2: Event overlaps on end date
test('2.2: Event overlaps on end date', () => {
  const event: TravelEvent = {
    id: 'event-1',
    user_id: 'user-123',
    name: 'Trip',
    start_date: '2024-06-01',
    end_date: '2024-06-05',
    color: '#FF0000',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const checkDate = parseISO('2024-06-05');
  assert(doesTravelEventOverlapDate(event, checkDate), 'Event should overlap on end date');
});

// Test 2.3: Event overlaps on middle date
test('2.3: Event overlaps on middle date', () => {
  const event: TravelEvent = {
    id: 'event-1',
    user_id: 'user-123',
    name: 'Trip',
    start_date: '2024-06-01',
    end_date: '2024-06-05',
    color: '#FF0000',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const checkDate = parseISO('2024-06-03');
  assert(doesTravelEventOverlapDate(event, checkDate), 'Event should overlap on middle date');
});

// Test 2.4: Event does not overlap before start
test('2.4: Event does not overlap before start', () => {
  const event: TravelEvent = {
    id: 'event-1',
    user_id: 'user-123',
    name: 'Trip',
    start_date: '2024-06-01',
    end_date: '2024-06-05',
    color: '#FF0000',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const checkDate = parseISO('2024-05-31');
  assert(!doesTravelEventOverlapDate(event, checkDate), 'Event should not overlap before start');
});

// Test 2.5: Event does not overlap after end
test('2.5: Event does not overlap after end', () => {
  const event: TravelEvent = {
    id: 'event-1',
    user_id: 'user-123',
    name: 'Trip',
    start_date: '2024-06-01',
    end_date: '2024-06-05',
    color: '#FF0000',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const checkDate = parseISO('2024-06-06');
  assert(!doesTravelEventOverlapDate(event, checkDate), 'Event should not overlap after end');
});

// Test 2.6: Single-day event overlaps on that day
test('2.6: Single-day event overlaps on that day', () => {
  const event: TravelEvent = {
    id: 'event-1',
    user_id: 'user-123',
    name: 'Trip',
    start_date: '2024-06-01',
    end_date: '2024-06-01',
    color: '#FF0000',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const checkDate = parseISO('2024-06-01');
  assert(doesTravelEventOverlapDate(event, checkDate), 'Single-day event should overlap on that day');
});

// Test 2.7: Single-day event does not overlap on other days
test('2.7: Single-day event does not overlap on other days', () => {
  const event: TravelEvent = {
    id: 'event-1',
    user_id: 'user-123',
    name: 'Trip',
    start_date: '2024-06-01',
    end_date: '2024-06-01',
    color: '#FF0000',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const checkDate = parseISO('2024-06-02');
  assert(!doesTravelEventOverlapDate(event, checkDate), 'Single-day event should not overlap on other days');
});

// ============================================================================
// SECTION 3: Calendar Utilities - getTravelEventsForDateRange
// ============================================================================

console.log('\n=== SECTION 3: getTravelEventsForDateRange() ===\n');

// Test 3.1: Filters events that overlap with range
test('3.1: Filters events that overlap with range', () => {
  const events: TravelEvent[] = [
    {
      id: 'event-1',
      user_id: 'user-123',
      name: 'Event 1',
      start_date: '2024-06-01',
      end_date: '2024-06-05',
      color: '#FF0000',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'event-2',
      user_id: 'user-123',
      name: 'Event 2',
      start_date: '2024-06-10',
      end_date: '2024-06-15',
      color: '#00FF00',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const startDate = parseISO('2024-06-03');
  const endDate = parseISO('2024-06-07');
  const filtered = getTravelEventsForDateRange(events, startDate, endDate);

  assertEqual(filtered.length, 1);
  assertEqual(filtered[0].id, 'event-1');
});

// Test 3.2: Includes events that start before range but end in range
test('3.2: Includes events that start before range but end in range', () => {
  const events: TravelEvent[] = [
    {
      id: 'event-1',
      user_id: 'user-123',
      name: 'Event 1',
      start_date: '2024-05-25',
      end_date: '2024-06-03',
      color: '#FF0000',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const startDate = parseISO('2024-06-01');
  const endDate = parseISO('2024-06-07');
  const filtered = getTravelEventsForDateRange(events, startDate, endDate);

  assertEqual(filtered.length, 1);
});

// Test 3.3: Includes events that start in range but end after range
test('3.3: Includes events that start in range but end after range', () => {
  const events: TravelEvent[] = [
    {
      id: 'event-1',
      user_id: 'user-123',
      name: 'Event 1',
      start_date: '2024-06-05',
      end_date: '2024-06-15',
      color: '#FF0000',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const startDate = parseISO('2024-06-01');
  const endDate = parseISO('2024-06-07');
  const filtered = getTravelEventsForDateRange(events, startDate, endDate);

  assertEqual(filtered.length, 1);
});

// Test 3.4: Includes events that completely contain range
test('3.4: Includes events that completely contain range', () => {
  const events: TravelEvent[] = [
    {
      id: 'event-1',
      user_id: 'user-123',
      name: 'Event 1',
      start_date: '2024-05-01',
      end_date: '2024-07-01',
      color: '#FF0000',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const startDate = parseISO('2024-06-01');
  const endDate = parseISO('2024-06-07');
  const filtered = getTravelEventsForDateRange(events, startDate, endDate);

  assertEqual(filtered.length, 1);
});

// Test 3.5: Excludes events that are completely before range
test('3.5: Excludes events that are completely before range', () => {
  const events: TravelEvent[] = [
    {
      id: 'event-1',
      user_id: 'user-123',
      name: 'Event 1',
      start_date: '2024-05-01',
      end_date: '2024-05-31',
      color: '#FF0000',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const startDate = parseISO('2024-06-01');
  const endDate = parseISO('2024-06-07');
  const filtered = getTravelEventsForDateRange(events, startDate, endDate);

  assertEqual(filtered.length, 0);
});

// Test 3.6: Excludes events that are completely after range
test('3.6: Excludes events that are completely after range', () => {
  const events: TravelEvent[] = [
    {
      id: 'event-1',
      user_id: 'user-123',
      name: 'Event 1',
      start_date: '2024-06-10',
      end_date: '2024-06-15',
      color: '#FF0000',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const startDate = parseISO('2024-06-01');
  const endDate = parseISO('2024-06-07');
  const filtered = getTravelEventsForDateRange(events, startDate, endDate);

  assertEqual(filtered.length, 0);
});

// Test 3.7: Handles empty array
test('3.7: Handles empty array', () => {
  const events: TravelEvent[] = [];
  const startDate = parseISO('2024-06-01');
  const endDate = parseISO('2024-06-07');
  const filtered = getTravelEventsForDateRange(events, startDate, endDate);

  assertEqual(filtered.length, 0);
});

// Test 3.8: Handles events that end exactly on range start
test('3.8: Handles events that end exactly on range start', () => {
  const events: TravelEvent[] = [
    {
      id: 'event-1',
      user_id: 'user-123',
      name: 'Event 1',
      start_date: '2024-05-25',
      end_date: '2024-06-01',
      color: '#FF0000',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const startDate = parseISO('2024-06-01');
  const endDate = parseISO('2024-06-07');
  const filtered = getTravelEventsForDateRange(events, startDate, endDate);

  assertEqual(filtered.length, 1, 'Event ending on range start should be included');
});

// Test 3.9: Handles events that start exactly on range end
test('3.9: Handles events that start exactly on range end', () => {
  const events: TravelEvent[] = [
    {
      id: 'event-1',
      user_id: 'user-123',
      name: 'Event 1',
      start_date: '2024-06-07',
      end_date: '2024-06-15',
      color: '#FF0000',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const startDate = parseISO('2024-06-01');
  const endDate = parseISO('2024-06-07');
  const filtered = getTravelEventsForDateRange(events, startDate, endDate);

  assertEqual(filtered.length, 1, 'Event starting on range end should be included');
});

// ============================================================================
// SECTION 4: Edge Cases and Error Handling
// ============================================================================

console.log('\n=== SECTION 4: Edge Cases and Error Handling ===\n');

// Test 4.1: Handles invalid date strings gracefully
test('4.1: Handles invalid date strings gracefully', () => {
  const event: TravelEvent = {
    id: 'event-1',
    user_id: 'user-123',
    name: 'Trip',
    start_date: 'invalid-date',
    end_date: '2024-06-05',
    color: '#FF0000',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const checkDate = parseISO('2024-06-01');
  // Should not throw, but may return false
  const result = doesTravelEventOverlapDate(event, checkDate);
  assert(typeof result === 'boolean', 'Should return boolean even with invalid date');
});

// Test 4.2: Handles very long date ranges
test('4.2: Handles very long date ranges', () => {
  const events: TravelEvent[] = [
    {
      id: 'event-1',
      user_id: 'user-123',
      name: 'Long Trip',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      color: '#FF0000',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const startDate = parseISO('2024-06-01');
  const endDate = parseISO('2024-06-07');
  const filtered = getTravelEventsForDateRange(events, startDate, endDate);

  assertEqual(filtered.length, 1);
});

// ============================================================================
// TEST SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('TEST SUMMARY');
console.log('='.repeat(60));

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
const total = results.length;

console.log(`\nTotal tests: ${total}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

if (failed > 0) {
  console.log('\nFailed tests:');
  results.filter(r => !r.passed).forEach(r => {
    console.log(`  ❌ Test ${r.testNumber}: ${r.name}`);
    console.log(`     ${r.message}`);
  });
}

console.log('\n' + '='.repeat(60));

if (failed === 0) {
  console.log('🎉 All tests passed!');
  process.exit(0);
} else {
  console.log(`❌ ${failed} test(s) failed`);
  process.exit(1);
}

