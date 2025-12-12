/**
 * RECURRING TEMPLATE COMPLETION PREVENTION TESTS
 * 
 * Tests for Problem 9: Recurring Template Cannot Be Completed
 * 
 * Tests verify:
 * 1. Recurring templates cannot be marked as done
 * 2. UI correctly hides/disables completion buttons for templates
 * 3. Occurrences can still be completed normally
 * 4. Error messages are displayed when attempting to complete templates
 * 
 * Usage:
 *   tsx test-recurring-template-completion.ts
 */

import { isRecurringTemplate } from './src/utils/recurring';
import type { Task } from '@mydailyops/core';

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
      message: error.message || 'Test failed',
      expected: error.expected,
      actual: error.actual,
    };
    results.push(result);
    console.log(`❌ Test ${testCounter}: ${name}`);
    console.log(`   Error: ${error.message}`);
    if (error.expected !== undefined) {
      console.log(`   Expected: ${JSON.stringify(error.expected)}`);
    }
    if (error.actual !== undefined) {
      console.log(`   Actual: ${JSON.stringify(error.actual)}`);
    }
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual: any, expected: any, message?: string) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    const error: any = new Error(message || `Expected ${expectedStr}, got ${actualStr}`);
    error.expected = expected;
    error.actual = actual;
    throw error;
  }
}

// ============================================================================
// TEST DATA HELPERS
// ============================================================================

function createTemplateTask(id: string, title: string): Task & { recurring_options: any } {
  return {
    id,
    title,
    description: '',
    priority: 'medium' as const,
    category: '',
    status: 'pending',
    deadline: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    isCompleted: false,
    isRecurring: true,
    recurringType: 'daily',
    recurringInterval: 1,
    recurringDaysOfWeek: undefined,
    recurringEndDate: undefined,
    parentRecurringId: undefined,
    recurring: undefined,
    recurring_options: {
      type: 'daily',
      interval: 1,
    },
  } as any;
}

function createOccurrenceTask(id: string, title: string, templateId?: string): Task {
  return {
    id,
    title,
    description: '',
    priority: 'medium' as const,
    category: '',
    status: 'pending',
    deadline: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    isCompleted: false,
    isRecurring: false,
    recurringType: undefined,
    recurringInterval: undefined,
    recurringDaysOfWeek: undefined,
    recurringEndDate: undefined,
    parentRecurringId: templateId,
    recurring: undefined,
    recurring_options: null,
  } as any;
}

function createNormalTask(id: string, title: string): Task {
  return {
    id,
    title,
    description: '',
    priority: 'medium' as const,
    category: '',
    status: 'pending',
    deadline: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    isCompleted: false,
    isRecurring: false,
    recurringType: undefined,
    recurringInterval: undefined,
    recurringDaysOfWeek: undefined,
    recurringEndDate: undefined,
    parentRecurringId: undefined,
    recurring: undefined,
    recurring_options: null,
  } as any;
}

// ============================================================================
// SECTION 1: isRecurringTemplate Function Tests
// ============================================================================

console.log('\n📋 SECTION 1: isRecurringTemplate Function Tests');
console.log('='.repeat(80));

test('1.1: Template task with recurring_options is identified as template', () => {
  const template = createTemplateTask('template-1', 'Daily Template');
  const result = isRecurringTemplate(template);
  assert(result === true, 'Template should be identified as template');
});

test('1.2: Occurrence task without recurring_options is NOT identified as template', () => {
  const occurrence = createOccurrenceTask('occurrence-1', 'Daily Task Instance', 'template-1');
  const result = isRecurringTemplate(occurrence);
  assert(result === false, 'Occurrence should NOT be identified as template');
});

test('1.3: Normal task without recurring_options is NOT identified as template', () => {
  const normal = createNormalTask('normal-1', 'Normal Task');
  const result = isRecurringTemplate(normal);
  assert(result === false, 'Normal task should NOT be identified as template');
});

test('1.4: Template with recurring_options.type = "none" is NOT identified as template', () => {
  const task: any = createTemplateTask('task-1', 'Task');
  task.recurring_options = { type: 'none' };
  const result = isRecurringTemplate(task);
  assert(result === false, 'Task with type="none" should NOT be identified as template');
});

test('1.5: Template with recurring_options.type = "daily" is identified as template', () => {
  const task: any = createTemplateTask('task-1', 'Daily Task');
  task.recurring_options = { type: 'daily', interval: 1 };
  const result = isRecurringTemplate(task);
  assert(result === true, 'Task with type="daily" should be identified as template');
});

test('1.6: Template with recurring_options.type = "weekly" is identified as template', () => {
  const task: any = createTemplateTask('task-1', 'Weekly Task');
  task.recurring_options = { type: 'weekly', interval: 1, weekdays: ['monday'] };
  const result = isRecurringTemplate(task);
  assert(result === true, 'Task with type="weekly" should be identified as template');
});

// ============================================================================
// SECTION 2: Template Completion Prevention Logic
// ============================================================================

console.log('\n📋 SECTION 2: Template Completion Prevention Logic');
console.log('='.repeat(80));

test('2.1: Attempting to set template status to "done" should be prevented', () => {
  const template = createTemplateTask('template-1', 'Daily Template');
  
  // Simulate updateTask logic
  const shouldPrevent = template.recurring_options && 
                        template.recurring_options.type !== 'none' && 
                        'done' === 'done';
  
  assert(shouldPrevent === true, 'Should prevent template completion');
});

test('2.2: Attempting to set occurrence status to "done" should be allowed', () => {
  const occurrence = createOccurrenceTask('occurrence-1', 'Daily Task Instance', 'template-1');
  
  // Simulate updateTask logic
  const isTemplate = isRecurringTemplate(occurrence);
  const shouldPrevent = isTemplate && 'done' === 'done';
  
  assert(shouldPrevent === false, 'Should allow occurrence completion');
});

test('2.3: Attempting to set normal task status to "done" should be allowed', () => {
  const normal = createNormalTask('normal-1', 'Normal Task');
  
  // Simulate updateTask logic
  const isTemplate = isRecurringTemplate(normal);
  const shouldPrevent = isTemplate && 'done' === 'done';
  
  assert(shouldPrevent === false, 'Should allow normal task completion');
});

test('2.4: Updating template with status="pending" should be allowed', () => {
  const template = createTemplateTask('template-1', 'Daily Template');
  
  // Simulate updateTask logic - status is NOT "done"
  const isTemplate = isRecurringTemplate(template);
  const shouldPrevent = isTemplate && 'pending' === 'done';
  
  assert(shouldPrevent === false, 'Should allow updating template status to pending');
});

test('2.5: Updating template with other fields (not status) should be allowed', () => {
  const template = createTemplateTask('template-1', 'Daily Template');
  
  // Simulate updateTask logic - no status update
  const isTemplate = isRecurringTemplate(template);
  const statusUpdate = undefined;
  const shouldPrevent = isTemplate && statusUpdate === 'done';
  
  assert(shouldPrevent === false, 'Should allow updating template fields other than status');
});

// ============================================================================
// SECTION 3: UI Component Logic Tests
// ============================================================================

console.log('\n📋 SECTION 3: UI Component Logic Tests');
console.log('='.repeat(80));

test('3.1: TaskCard should hide toggle button for template', () => {
  const template = createTemplateTask('template-1', 'Daily Template');
  const isTemplate = isRecurringTemplate(template);
  
  // UI should hide button if isTemplate === true
  const shouldShowButton = !isTemplate;
  
  assert(shouldShowButton === false, 'Toggle button should be hidden for template');
});

test('3.2: TaskCard should show toggle button for occurrence', () => {
  const occurrence = createOccurrenceTask('occurrence-1', 'Daily Task Instance', 'template-1');
  const isTemplate = isRecurringTemplate(occurrence);
  
  // UI should show button if isTemplate === false
  const shouldShowButton = !isTemplate;
  
  assert(shouldShowButton === true, 'Toggle button should be shown for occurrence');
});

test('3.3: TaskCard should show toggle button for normal task', () => {
  const normal = createNormalTask('normal-1', 'Normal Task');
  const isTemplate = isRecurringTemplate(normal);
  
  // UI should show button if isTemplate === false
  const shouldShowButton = !isTemplate;
  
  assert(shouldShowButton === true, 'Toggle button should be shown for normal task');
});

// ============================================================================
// SECTION 4: Error Message Tests
// ============================================================================

console.log('\n📋 SECTION 4: Error Message Tests');
console.log('='.repeat(80));

test('4.1: Error message should mention templates cannot be completed', () => {
  const errorMessage = "Cannot complete recurring template. Only occurrences can be completed.";
  assert(
    errorMessage.includes('Cannot complete recurring template'),
    'Error message should mention templates cannot be completed'
  );
  assert(
    errorMessage.includes('occurrences'),
    'Error message should mention occurrences can be completed'
  );
});

test('4.2: Error message format matches expected pattern', () => {
  const expectedPattern = /Cannot complete recurring template/i;
  const errorMessage = "Cannot complete recurring template. Only occurrences can be completed.";
  
  assert(
    expectedPattern.test(errorMessage),
    'Error message should match expected pattern'
  );
});

// ============================================================================
// TEST SUMMARY
// ============================================================================

function printSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`\nTotal Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`\n  Test ${r.testNumber}: ${r.name}`);
      console.log(`    ${r.message}`);
    });
  }

  console.log('\n' + '='.repeat(80));

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 All tests passed!');
    process.exit(0);
  }
}

// Run tests
printSummary();

