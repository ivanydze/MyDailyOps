/**
 * WEEKEND FILTERING TESTS
 * 
 * Tests for Problem 8: Weekends Visibility Control
 * 
 * Usage:
 *   tsx test-weekend-filtering.ts
 */

import { isWeekend, shouldShowTaskOnWeekend } from './src/utils/weekend';
import type { WeekendFilterSettings } from './src/stores/settingsStore';
import type { Task } from '@mydailyops/core';
import { addDays, subDays, startOfDay, formatISO } from 'date-fns';

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

// Helper to create a test task
function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'test-task-1',
    user_id: 'test-user',
    title: 'Test Task',
    description: '',
    status: 'pending',
    priority: 'medium',
    category: 'Work',
    deadline: null,
    start_date: null,
    created_at: formatISO(new Date()),
    updated_at: formatISO(new Date()),
    ...overrides,
  };
}

// Helper to create test settings
function createSettings(overrides: Partial<WeekendFilterSettings> = {}): WeekendFilterSettings {
  return {
    showTasksOnWeekends: true,
    hiddenCategoriesOnWeekends: [],
    hiddenPrioritiesOnWeekends: [],
    ...overrides,
  };
}

console.log('🧪 Weekend Filtering Tests\n');
console.log('='.repeat(60));

// ============================================================
// SECTION 1: Weekend Detection
// ============================================================
console.log('\n📅 Section 1: Weekend Detection\n');

// Find a Saturday
const today = new Date();
let saturday = new Date(today);
while (saturday.getDay() !== 6) {
  saturday = addDays(saturday, 1);
}

// Find a Sunday
let sunday = new Date(today);
while (sunday.getDay() !== 0) {
  sunday = addDays(sunday, 1);
}

// Find a Monday (weekday)
let monday = new Date(today);
while (monday.getDay() !== 1) {
  monday = addDays(monday, 1);
}

test('Saturday is detected as weekend', () => {
  return isWeekend(saturday);
});

test('Sunday is detected as weekend', () => {
  return isWeekend(sunday);
});

test('Monday is NOT detected as weekend', () => {
  return !isWeekend(monday);
});

test('Friday is NOT detected as weekend', () => {
  let friday = new Date(today);
  while (friday.getDay() !== 5) {
    friday = addDays(friday, 1);
  }
  return !isWeekend(friday);
});

// ============================================================
// SECTION 2: Filtering When Weekend Visibility is ON
// ============================================================
console.log('\n🔓 Section 2: Filtering When Weekend Visibility is ON\n');

test('Task is shown when showTasksOnWeekends = true (weekend)', () => {
  const task = createTask({ category: 'Work', priority: 'low' });
  const settings = createSettings({ showTasksOnWeekends: true });
  return shouldShowTaskOnWeekend(task, settings, saturday);
});

test('Task is shown when showTasksOnWeekends = true (weekday)', () => {
  const task = createTask({ category: 'Work', priority: 'low' });
  const settings = createSettings({ showTasksOnWeekends: true });
  return shouldShowTaskOnWeekend(task, settings, monday);
});

test('Task is shown regardless of category when showTasksOnWeekends = true', () => {
  const task = createTask({ category: 'Work', priority: 'low' });
  const settings = createSettings({
    showTasksOnWeekends: true,
    hiddenCategoriesOnWeekends: ['Work'],
  });
  return shouldShowTaskOnWeekend(task, settings, saturday);
});

test('Task is shown regardless of priority when showTasksOnWeekends = true', () => {
  const task = createTask({ category: 'Work', priority: 'low' });
  const settings = createSettings({
    showTasksOnWeekends: true,
    hiddenPrioritiesOnWeekends: ['low'],
  });
  return shouldShowTaskOnWeekend(task, settings, saturday);
});

// ============================================================
// SECTION 3: Filtering When Weekend Visibility is OFF (Weekdays)
// ============================================================
console.log('\n📆 Section 3: Filtering When Weekend Visibility is OFF (Weekdays)\n');

test('Task is shown on weekday when showTasksOnWeekends = false', () => {
  const task = createTask({ category: 'Work', priority: 'low' });
  const settings = createSettings({ showTasksOnWeekends: false });
  return shouldShowTaskOnWeekend(task, settings, monday);
});

test('Task with hidden category is shown on weekday', () => {
  const task = createTask({ category: 'Work', priority: 'low' });
  const settings = createSettings({
    showTasksOnWeekends: false,
    hiddenCategoriesOnWeekends: ['Work'],
  });
  return shouldShowTaskOnWeekend(task, settings, monday);
});

test('Task with hidden priority is shown on weekday', () => {
  const task = createTask({ category: 'Work', priority: 'low' });
  const settings = createSettings({
    showTasksOnWeekends: false,
    hiddenPrioritiesOnWeekends: ['low'],
  });
  return shouldShowTaskOnWeekend(task, settings, monday);
});

// ============================================================
// SECTION 4: High Priority Always Visible
// ============================================================
console.log('\n⭐ Section 4: High Priority Always Visible\n');

test('High priority task is shown on weekend even when filtering is OFF', () => {
  const task = createTask({ priority: 'high', category: 'Work' });
  const settings = createSettings({
    showTasksOnWeekends: false,
    hiddenCategoriesOnWeekends: ['Work'],
    hiddenPrioritiesOnWeekends: ['low', 'medium'],
  });
  return shouldShowTaskOnWeekend(task, settings, saturday);
});

test('High priority task is shown on weekend with hidden category', () => {
  const task = createTask({ priority: 'high', category: 'Work' });
  const settings = createSettings({
    showTasksOnWeekends: false,
    hiddenCategoriesOnWeekends: ['Work'],
  });
  return shouldShowTaskOnWeekend(task, settings, saturday);
});

// ============================================================
// SECTION 5: Category Filtering on Weekends
// ============================================================
console.log('\n🏷️  Section 5: Category Filtering on Weekends\n');

test('Task with hidden category is hidden on weekend', () => {
  const task = createTask({ category: 'Work', priority: 'medium' });
  const settings = createSettings({
    showTasksOnWeekends: false,
    hiddenCategoriesOnWeekends: ['Work'],
  });
  return !shouldShowTaskOnWeekend(task, settings, saturday);
});

test('Task with non-hidden category is shown on weekend', () => {
  const task = createTask({ category: 'Personal', priority: 'medium' });
  const settings = createSettings({
    showTasksOnWeekends: false,
    hiddenCategoriesOnWeekends: ['Work'],
  });
  return shouldShowTaskOnWeekend(task, settings, saturday);
});

test('Task with multiple hidden categories - hidden category is hidden', () => {
  const task = createTask({ category: 'Finance', priority: 'medium' });
  const settings = createSettings({
    showTasksOnWeekends: false,
    hiddenCategoriesOnWeekends: ['Work', 'Finance', 'Health'],
  });
  return !shouldShowTaskOnWeekend(task, settings, saturday);
});

test('Task with no category is shown on weekend (not in hidden list)', () => {
  const task = createTask({ category: null as any, priority: 'medium' });
  const settings = createSettings({
    showTasksOnWeekends: false,
    hiddenCategoriesOnWeekends: ['Work', 'Finance'],
  });
  return shouldShowTaskOnWeekend(task, settings, saturday);
});

// ============================================================
// SECTION 6: Priority Filtering on Weekends
// ============================================================
console.log('\n🎯 Section 6: Priority Filtering on Weekends\n');

test('Low priority task with hidden priority is hidden on weekend', () => {
  const task = createTask({ category: 'Personal', priority: 'low' });
  const settings = createSettings({
    showTasksOnWeekends: false,
    hiddenPrioritiesOnWeekends: ['low'],
  });
  return !shouldShowTaskOnWeekend(task, settings, saturday);
});

test('Medium priority task with hidden priority is hidden on weekend', () => {
  const task = createTask({ category: 'Personal', priority: 'medium' });
  const settings = createSettings({
    showTasksOnWeekends: false,
    hiddenPrioritiesOnWeekends: ['medium'],
  });
  return !shouldShowTaskOnWeekend(task, settings, saturday);
});

test('Low priority task with medium hidden is shown on weekend', () => {
  const task = createTask({ category: 'Personal', priority: 'low' });
  const settings = createSettings({
    showTasksOnWeekends: false,
    hiddenPrioritiesOnWeekends: ['medium'],
  });
  return shouldShowTaskOnWeekend(task, settings, saturday);
});

test('Task with multiple hidden priorities - hidden priority is hidden', () => {
  const task = createTask({ category: 'Personal', priority: 'low' });
  const settings = createSettings({
    showTasksOnWeekends: false,
    hiddenPrioritiesOnWeekends: ['low', 'medium'],
  });
  return !shouldShowTaskOnWeekend(task, settings, saturday);
});

// ============================================================
// SECTION 7: Combined Filters
// ============================================================
console.log('\n🔗 Section 7: Combined Filters\n');

test('Task hidden by both category and priority is hidden', () => {
  const task = createTask({ category: 'Work', priority: 'low' });
  const settings = createSettings({
    showTasksOnWeekends: false,
    hiddenCategoriesOnWeekends: ['Work'],
    hiddenPrioritiesOnWeekends: ['low'],
  });
  return !shouldShowTaskOnWeekend(task, settings, saturday);
});

test('Task hidden by category but not priority is hidden', () => {
  const task = createTask({ category: 'Work', priority: 'medium' });
  const settings = createSettings({
    showTasksOnWeekends: false,
    hiddenCategoriesOnWeekends: ['Work'],
    hiddenPrioritiesOnWeekends: ['low'],
  });
  return !shouldShowTaskOnWeekend(task, settings, saturday);
});

test('Task hidden by priority but not category is hidden', () => {
  const task = createTask({ category: 'Personal', priority: 'low' });
  const settings = createSettings({
    showTasksOnWeekends: false,
    hiddenCategoriesOnWeekends: ['Work'],
    hiddenPrioritiesOnWeekends: ['low'],
  });
  return !shouldShowTaskOnWeekend(task, settings, saturday);
});

test('Task not hidden by category or priority is shown', () => {
  const task = createTask({ category: 'Personal', priority: 'medium' });
  const settings = createSettings({
    showTasksOnWeekends: false,
    hiddenCategoriesOnWeekends: ['Work'],
    hiddenPrioritiesOnWeekends: ['low'],
  });
  return shouldShowTaskOnWeekend(task, settings, saturday);
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

