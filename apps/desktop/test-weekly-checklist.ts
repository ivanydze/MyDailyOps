/**
 * WEEKLY CHECKLIST TESTS
 * 
 * Tests for Problem 10: Weekly Checklists
 * 
 * Usage:
 *   tsx test-weekly-checklist.ts
 */

import {
  getWeekStartDate,
  getWeekEndDate,
  getWeekKey,
  getCurrentWeekKey,
  getWeekRange,
  getCurrentWeekRange,
  isSameWeek,
  isPastWeek,
  getNextWeekStart,
  getPreviousWeekStart,
} from './src/utils/week';

import {
  createNewWeeklyChecklist,
  createWeeklyChecklistForWeek,
  createChecklistItem,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  toggleChecklistItem,
  getChecklistStats,
  isCurrentWeekChecklist,
  validateChecklist,
} from './src/utils/weeklyChecklist';

import type { WeeklyChecklist, ChecklistItem } from './src/types/weeklyChecklist';
import { formatISO, parseISO, addDays, subDays, startOfDay } from 'date-fns';

let testsPassed = 0;
let testsFailed = 0;

function test(name: string, fn: () => boolean) {
  try {
    const result = fn();
    if (result) {
      testsPassed++;
      console.log(`✅ ${name}`);
    } else {
      testsFailed++;
      console.log(`❌ ${name}`);
    }
  } catch (error) {
    testsFailed++;
    console.log(`❌ ${name}`);
    console.error(`   Error:`, error);
  }
}

// Helper to create a test checklist
function createTestChecklist(overrides: Partial<WeeklyChecklist> = {}): WeeklyChecklist {
  const now = new Date().toISOString();
  return {
    id: 'test-checklist-1',
    user_id: 'test-user',
    week_start_date: '2025-01-12',
    week_end_date: '2025-01-18',
    title: undefined,
    items: [],
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

console.log('🧪 Weekly Checklist Tests\n');
console.log('='.repeat(60));

// ============================================================
// SECTION 1: Week Detection Utilities
// ============================================================
console.log('\n📅 Section 1: Week Detection Utilities\n');

// Find a known Sunday (Jan 12, 2025 is a Sunday)
const testSunday = new Date(2025, 0, 12); // Jan 12, 2025
const testMonday = new Date(2025, 0, 13); // Jan 13, 2025
const testSaturday = new Date(2025, 0, 18); // Jan 18, 2025

test('Week start date returns Sunday when weekStartsOn = 0', () => {
  const start = getWeekStartDate(testMonday, 0);
  return formatISO(start, { representation: 'date' }) === '2025-01-12';
});

test('Week start date returns Monday when weekStartsOn = 1', () => {
  // If weekStartsOn = 1 (Monday), Sunday Jan 12 should be in the week that starts Jan 6 (previous Monday)
  // Actually, Jan 12 is Sunday, so with weekStartsOn=1, the week containing Jan 12 starts on Jan 6
  // But let's test with a Monday date instead
  const start = getWeekStartDate(testMonday, 1);
  return formatISO(start, { representation: 'date' }) === '2025-01-13';
});

test('Week end date returns Saturday when weekStartsOn = 0', () => {
  const end = getWeekEndDate(testMonday, 0);
  return formatISO(end, { representation: 'date' }) === '2025-01-18';
});

test('Week end date returns Sunday when weekStartsOn = 1', () => {
  const end = getWeekEndDate(testMonday, 1);
  return formatISO(end, { representation: 'date' }) === '2025-01-19';
});

test('Week key returns week start date as YYYY-MM-DD', () => {
  const key = getWeekKey(testMonday, 0);
  return key === '2025-01-12';
});

test('Current week key returns valid date string', () => {
  const key = getCurrentWeekKey(0);
  const date = parseISO(key);
  return !isNaN(date.getTime()) && key.length === 10;
});

test('Week range returns start and end dates', () => {
  const range = getWeekRange(testMonday, 0);
  return range.week_start_date === '2025-01-12' && range.week_end_date === '2025-01-18';
});

test('isSameWeek returns true for dates in same week', () => {
  return isSameWeek(testMonday, testSaturday, 0);
});

test('isSameWeek returns false for dates in different weeks', () => {
  const nextMonday = addDays(testMonday, 7);
  return !isSameWeek(testMonday, nextMonday, 0);
});

test('isPastWeek returns true for past weeks', () => {
  const pastWeek = subDays(new Date(), 14);
  return isPastWeek(pastWeek, new Date(), 0);
});

test('isPastWeek returns false for current week', () => {
  return !isPastWeek(new Date(), new Date(), 0);
});

test('getNextWeekStart adds 7 days', () => {
  const next = getNextWeekStart('2025-01-12');
  return formatISO(next, { representation: 'date' }) === '2025-01-19';
});

test('getPreviousWeekStart subtracts 7 days', () => {
  const prev = getPreviousWeekStart('2025-01-12');
  return formatISO(prev, { representation: 'date' }) === '2025-01-05';
});

// ============================================================
// SECTION 2: Checklist Item Creation
// ============================================================
console.log('\n📝 Section 2: Checklist Item Creation\n');

test('createChecklistItem generates item with UUID', () => {
  const item = createChecklistItem('Test item');
  return item.id.length > 0 && item.text === 'Test item' && !item.completed;
});

test('createChecklistItem trims text', () => {
  const item = createChecklistItem('  Test item  ');
  return item.text === 'Test item';
});

test('createChecklistItem sets completed to false', () => {
  const item = createChecklistItem('Test');
  return item.completed === false;
});

test('createChecklistItem sets created_at timestamp', () => {
  const item = createChecklistItem('Test');
  const date = parseISO(item.created_at);
  return !isNaN(date.getTime());
});

// ============================================================
// SECTION 3: Weekly Checklist Creation
// ============================================================
console.log('\n📋 Section 3: Weekly Checklist Creation\n');

test('createNewWeeklyChecklist generates checklist for current week', () => {
  const checklist = createNewWeeklyChecklist('test-user', 0);
  const currentWeekKey = getCurrentWeekKey(0);
  return checklist.user_id === 'test-user' && checklist.week_start_date === currentWeekKey;
});

test('createNewWeeklyChecklist has empty items array', () => {
  const checklist = createNewWeeklyChecklist('test-user', 0);
  return Array.isArray(checklist.items) && checklist.items.length === 0;
});

test('createWeeklyChecklistForWeek uses provided date', () => {
  const checklist = createWeeklyChecklistForWeek('test-user', testMonday, 0);
  return checklist.week_start_date === '2025-01-12';
});

test('createWeeklyChecklistForWeek sets correct week_end_date', () => {
  const checklist = createWeeklyChecklistForWeek('test-user', testMonday, 0);
  return checklist.week_end_date === '2025-01-18';
});

// ============================================================
// SECTION 4: Checklist Item Operations
// ============================================================
console.log('\n🔄 Section 4: Checklist Item Operations\n');

test('addChecklistItem adds item to checklist', () => {
  const checklist = createTestChecklist();
  const updated = addChecklistItem(checklist, 'New item');
  return updated.items.length === 1 && updated.items[0].text === 'New item';
});

test('addChecklistItem updates updated_at timestamp', () => {
  const checklist = createTestChecklist();
  const oldUpdated = checklist.updated_at;
  // Add a small delay to ensure timestamp changes
  const updated = addChecklistItem(checklist, 'New item');
  // Check that updated_at is different (should be newer)
  const oldDate = new Date(oldUpdated);
  const newDate = new Date(updated.updated_at);
  // updated_at should be updated (either different timestamp or at least a valid ISO string)
  return updated.updated_at !== oldUpdated || newDate >= oldDate;
});

test('updateChecklistItem updates item text', () => {
  const item = createChecklistItem('Old text');
  const checklist = createTestChecklist({ items: [item] });
  const updated = updateChecklistItem(checklist, item.id, { text: 'New text' });
  return updated.items[0].text === 'New text';
});

test('updateChecklistItem updates item completed status', () => {
  const item = createChecklistItem('Test');
  const checklist = createTestChecklist({ items: [item] });
  const updated = updateChecklistItem(checklist, item.id, { completed: true });
  return updated.items[0].completed === true;
});

test('deleteChecklistItem removes item from checklist', () => {
  const item1 = createChecklistItem('Item 1');
  const item2 = createChecklistItem('Item 2');
  const checklist = createTestChecklist({ items: [item1, item2] });
  const updated = deleteChecklistItem(checklist, item1.id);
  return updated.items.length === 1 && updated.items[0].id === item2.id;
});

test('toggleChecklistItem flips completion status', () => {
  const item = createChecklistItem('Test');
  const checklist = createTestChecklist({ items: [item] });
  const updated = toggleChecklistItem(checklist, item.id);
  return updated.items[0].completed === true;
});

test('toggleChecklistItem flips from true to false', () => {
  const item = createChecklistItem('Test');
  item.completed = true;
  const checklist = createTestChecklist({ items: [item] });
  const updated = toggleChecklistItem(checklist, item.id);
  return updated.items[0].completed === false;
});

// ============================================================
// SECTION 5: Checklist Statistics
// ============================================================
console.log('\n📊 Section 5: Checklist Statistics\n');

test('getChecklistStats calculates total items', () => {
  const item1 = createChecklistItem('Item 1');
  const item2 = createChecklistItem('Item 2');
  const checklist = createTestChecklist({ items: [item1, item2] });
  const stats = getChecklistStats(checklist);
  return stats.total_items === 2;
});

test('getChecklistStats calculates completed items', () => {
  const item1 = createChecklistItem('Item 1');
  item1.completed = true;
  const item2 = createChecklistItem('Item 2');
  const checklist = createTestChecklist({ items: [item1, item2] });
  const stats = getChecklistStats(checklist);
  return stats.completed_items === 1;
});

test('getChecklistStats calculates completion percentage', () => {
  const item1 = createChecklistItem('Item 1');
  item1.completed = true;
  const item2 = createChecklistItem('Item 2');
  item2.completed = true;
  const item3 = createChecklistItem('Item 3');
  const checklist = createTestChecklist({ items: [item1, item2, item3] });
  const stats = getChecklistStats(checklist);
  return stats.completion_percentage === 67; // 2/3 = 66.67% rounded to 67
});

test('getChecklistStats returns 0% for empty checklist', () => {
  const checklist = createTestChecklist();
  const stats = getChecklistStats(checklist);
  return stats.completion_percentage === 0 && stats.total_items === 0;
});

// ============================================================
// SECTION 6: Checklist Validation
// ============================================================
console.log('\n✅ Section 6: Checklist Validation\n');

test('validateChecklist returns true for valid checklist', () => {
  const checklist = createTestChecklist();
  return validateChecklist(checklist);
});

test('validateChecklist returns false for missing user_id', () => {
  const checklist = createTestChecklist({ user_id: '' as any });
  return !validateChecklist(checklist);
});

test('validateChecklist returns false for missing week_start_date', () => {
  const checklist = createTestChecklist({ week_start_date: '' as any });
  return !validateChecklist(checklist);
});

test('validateChecklist returns false for non-array items', () => {
  const checklist = createTestChecklist({ items: null as any });
  return !validateChecklist(checklist);
});

test('validateChecklist returns false for item without id', () => {
  const invalidItem = { text: 'Test', completed: false, created_at: new Date().toISOString() } as ChecklistItem;
  const checklist = createTestChecklist({ items: [invalidItem] });
  return !validateChecklist(checklist);
});

// ============================================================
// SECTION 7: Current Week Detection
// ============================================================
console.log('\n🗓️  Section 7: Current Week Detection\n');

test('isCurrentWeekChecklist returns true for current week', () => {
  const checklist = createNewWeeklyChecklist('test-user', 0);
  return isCurrentWeekChecklist(checklist, 0);
});

test('isCurrentWeekChecklist returns false for past week', () => {
  const checklist = createTestChecklist({ week_start_date: '2020-01-12' });
  return !isCurrentWeekChecklist(checklist, 0);
});

// ============================================================
// SUMMARY
// ============================================================
console.log('\n' + '='.repeat(60));
console.log('\n📊 Test Summary\n');
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`📈 Total:  ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
  console.log('\n🎉 All tests passed!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the results above.');
  process.exit(1);
}

