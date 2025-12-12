/**
 * RECURRING DEADLINE TITLE TESTS
 * 
 * Tests for Problem 6: Recurring Tasks With Deadlines Break Duration Rules
 * 
 * Tests verify:
 * 1. formatOccurrenceTitle correctly formats title with deadline
 * 2. extractBaseTitle correctly extracts base title from occurrence title
 * 3. Occurrences are created with deadline in title
 * 4. findAllInstancesFromTemplate works with titles containing deadlines
 * 5. findTemplateFromInstance works with titles containing deadlines
 * 
 * Usage:
 *   tsx test-recurring-deadline-title.ts
 */

import {
  formatOccurrenceTitle,
  extractBaseTitle,
  findAllInstancesFromTemplate,
  findTemplateFromInstance,
} from './src/utils/recurring';
import type { Task } from '@mydailyops/core';
import { formatISO, parseISO, addDays } from 'date-fns';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

interface TestResult {
  section: string;
  testNumber: number;
  name: string;
  passed: boolean;
  message: string;
  expected?: any;
  actual?: any;
}

const results: TestResult[] = [];
let currentSection = '';
let testCounter = 0;

// Parse command line arguments
const args = process.argv.slice(2);
const sectionArg = args.find(arg => arg.startsWith('--section='));
const sectionsToRun = sectionArg
  ? sectionArg.split('=')[1].split(',').map(s => s.trim())
  : null;

// Helper functions
function section(name: string) {
  currentSection = name;
  console.log(`\n📋 SECTION: ${name}`);
  console.log('='.repeat(80));
}

function test(name: string, fn: () => void) {
  testCounter++;
  
  // Skip if section filtering is enabled
  if (sectionsToRun && !sectionsToRun.includes(currentSection)) {
    return;
  }

  try {
    fn();
    const result: TestResult = {
      section: currentSection,
      testNumber: testCounter,
      name,
      passed: true,
      message: '✅ PASSED',
    };
    results.push(result);
    console.log(`✅ Test ${testCounter}: ${name}`);
  } catch (error: any) {
    const result: TestResult = {
      section: currentSection,
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
// SECTION 1: formatOccurrenceTitle Tests
// ============================================================================

section('1. formatOccurrenceTitle Function Tests');

test('1.1: Formats title with deadline in MM/DD/YYYY format', () => {
  const templateTitle = 'Weekly Report';
  const deadline = new Date('2025-12-15');
  const result = formatOccurrenceTitle(templateTitle, deadline);
  
  assertEqual(result, 'Weekly Report - 12/15/2025', 'Should append deadline in MM/DD/YYYY format');
});

test('1.2: Formats title with deadline as ISO string', () => {
  const templateTitle = 'Daily Task';
  const deadline = '2025-03-20T10:00:00Z';
  const result = formatOccurrenceTitle(templateTitle, deadline);
  
  // Should parse ISO string and format as MM/DD/YYYY
  assert(result.includes('03/20/2025'), 'Should parse ISO string and format correctly');
  assert(result.startsWith('Daily Task -'), 'Should start with template title');
});

test('1.3: Replaces existing date in title if present', () => {
  const templateTitle = 'Weekly Report - 01/01/2025';
  const deadline = new Date('2025-12-15');
  const result = formatOccurrenceTitle(templateTitle, deadline);
  
  assertEqual(result, 'Weekly Report - 12/15/2025', 'Should replace existing date');
});

test('1.4: Handles title without existing date', () => {
  const templateTitle = 'Monthly Review';
  const deadline = new Date('2025-06-30');
  const result = formatOccurrenceTitle(templateTitle, deadline);
  
  assertEqual(result, 'Monthly Review - 06/30/2025', 'Should append date if not present');
});

test('1.5: Formats date correctly for different months and days', () => {
  const templateTitle = 'Task';
  const testCases = [
    { date: new Date('2025-01-01'), expected: '01/01/2025' },
    { date: new Date('2025-12-31'), expected: '12/31/2025' },
    { date: new Date('2025-03-15'), expected: '03/15/2025' },
    { date: new Date('2025-09-05'), expected: '09/05/2025' },
  ];

  for (const testCase of testCases) {
    const result = formatOccurrenceTitle(templateTitle, testCase.date);
    assert(result.endsWith(testCase.expected), 
      `Should format ${testCase.date.toISOString()} as ${testCase.expected}, got ${result}`);
  }
});

// ============================================================================
// SECTION 2: extractBaseTitle Tests
// ============================================================================

section('2. extractBaseTitle Function Tests');

test('2.1: Extracts base title from occurrence title with deadline', () => {
  const occurrenceTitle = 'Weekly Report - 12/15/2025';
  const result = extractBaseTitle(occurrenceTitle);
  
  assertEqual(result, 'Weekly Report', 'Should extract base title without date');
});

test('2.2: Returns title as-is if no date pattern found', () => {
  const occurrenceTitle = 'Weekly Report';
  const result = extractBaseTitle(occurrenceTitle);
  
  assertEqual(result, 'Weekly Report', 'Should return title as-is if no date');
});

test('2.3: Handles title with spaces around dash', () => {
  const occurrenceTitle = 'Weekly Report  -  12/15/2025';
  const result = extractBaseTitle(occurrenceTitle);
  
  assertEqual(result, 'Weekly Report', 'Should handle spaces around dash');
});

test('2.4: Handles multiple dates (removes only the last one)', () => {
  // If title has date pattern in middle, it should still work
  const occurrenceTitle = 'Task 01/01/2025 - 12/15/2025';
  const result = extractBaseTitle(occurrenceTitle);
  
  // Should remove only the last date pattern
  assertEqual(result, 'Task 01/01/2025', 'Should remove only last date pattern');
});

test('2.5: Handles titles with different date formats at the end', () => {
  const occurrenceTitle = 'Weekly Report - 12/15/2025';
  const result = extractBaseTitle(occurrenceTitle);
  
  assertEqual(result, 'Weekly Report', 'Should remove date suffix');
});

// ============================================================================
// SECTION 3: Integration Tests - findAllInstancesFromTemplate
// ============================================================================

section('3. findAllInstancesFromTemplate with Deadline Titles');

test('3.1: Finds instances by base title when occurrences have deadlines in title', () => {
  const template: Task = {
    id: 'template-1',
    title: 'Weekly Report',
    description: '',
    priority: 'medium',
    category: '',
    status: 'pending',
    deadline: null,
    user_id: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    pinned: false,
    recurring_options: { type: 'weekly' } as any,
    is_completed: false,
  };

  const occurrence1: Task = {
    ...template,
    id: 'occ-1',
    title: 'Weekly Report - 12/15/2025',
    deadline: '2025-12-15T10:00:00Z',
    recurring_options: null,
  };

  const occurrence2: Task = {
    ...template,
    id: 'occ-2',
    title: 'Weekly Report - 12/22/2025',
    deadline: '2025-12-22T10:00:00Z',
    recurring_options: null,
  };

  const otherTask: Task = {
    ...template,
    id: 'other-1',
    title: 'Other Task',
    recurring_options: null,
  };

  const allTasks = [template, occurrence1, occurrence2, otherTask];
  const instances = findAllInstancesFromTemplate(template, allTasks);

  assertEqual(instances.length, 2, 'Should find 2 instances');
  assert(instances.some(i => i.id === occurrence1.id), 'Should include occurrence1');
  assert(instances.some(i => i.id === occurrence2.id), 'Should include occurrence2');
  assert(!instances.some(i => i.id === template.id), 'Should not include template');
  assert(!instances.some(i => i.id === otherTask.id), 'Should not include other tasks');
});

test('3.2: Works with template title that already has date', () => {
  // Edge case: template title might have date pattern, but occurrences will have different dates
  const template: Task = {
    id: 'template-2',
    title: 'Weekly Report - 01/01/2025', // Template might have initial date
    description: '',
    priority: 'medium',
    category: '',
    status: 'pending',
    deadline: null,
    user_id: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    pinned: false,
    recurring_options: { type: 'weekly' } as any,
    is_completed: false,
  };

  const occurrence: Task = {
    ...template,
    id: 'occ-1',
    title: 'Weekly Report - 12/15/2025', // Occurrence has different date
    deadline: '2025-12-15T10:00:00Z',
    recurring_options: null,
  };

  const allTasks = [template, occurrence];
  const instances = findAllInstancesFromTemplate(template, allTasks);

  assertEqual(instances.length, 1, 'Should find instance by base title');
  assertEqual(instances[0].id, occurrence.id, 'Should find the occurrence');
});

test('3.3: Handles legacy instances without dates in title', () => {
  const template: Task = {
    id: 'template-3',
    title: 'Daily Task',
    description: '',
    priority: 'medium',
    category: '',
    status: 'pending',
    deadline: null,
    user_id: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    pinned: false,
    recurring_options: { type: 'daily' } as any,
    is_completed: false,
  };

  // Legacy occurrence without date in title
  const legacyOccurrence: Task = {
    ...template,
    id: 'occ-legacy',
    title: 'Daily Task',
    deadline: '2025-12-15T10:00:00Z',
    recurring_options: null,
  };

  // New occurrence with date in title
  const newOccurrence: Task = {
    ...template,
    id: 'occ-new',
    title: 'Daily Task - 12/16/2025',
    deadline: '2025-12-16T10:00:00Z',
    recurring_options: null,
  };

  const allTasks = [template, legacyOccurrence, newOccurrence];
  const instances = findAllInstancesFromTemplate(template, allTasks);

  assertEqual(instances.length, 2, 'Should find both legacy and new instances');
  assert(instances.some(i => i.id === legacyOccurrence.id), 'Should include legacy occurrence');
  assert(instances.some(i => i.id === newOccurrence.id), 'Should include new occurrence');
});

// ============================================================================
// SECTION 4: Integration Tests - findTemplateFromInstance
// ============================================================================

section('4. findTemplateFromInstance with Deadline Titles');

test('4.1: Finds template from occurrence with deadline in title', () => {
  const template: Task = {
    id: 'template-1',
    title: 'Weekly Report',
    description: '',
    priority: 'medium',
    category: '',
    status: 'pending',
    deadline: null,
    user_id: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    pinned: false,
    recurring_options: { type: 'weekly' } as any,
    is_completed: false,
  };

  const occurrence: Task = {
    ...template,
    id: 'occ-1',
    title: 'Weekly Report - 12/15/2025',
    deadline: '2025-12-15T10:00:00Z',
    recurring_options: null,
  };

  const allTasks = [template, occurrence];
  const foundTemplate = findTemplateFromInstance(occurrence, allTasks);

  assert(foundTemplate !== null, 'Should find template');
  assertEqual(foundTemplate?.id, template.id, 'Should return correct template');
});

test('4.2: Works with multiple templates having same base title', () => {
  // This is an edge case - two templates with same base title but different users
  const template1: Task = {
    id: 'template-1',
    title: 'Weekly Report',
    user_id: 'user-1',
    recurring_options: { type: 'weekly' } as any,
  } as Task;

  const template2: Task = {
    id: 'template-2',
    title: 'Weekly Report',
    user_id: 'user-2',
    recurring_options: { type: 'weekly' } as any,
  } as Task;

  const occurrence: Task = {
    ...template1,
    id: 'occ-1',
    title: 'Weekly Report - 12/15/2025',
    user_id: 'user-1',
    recurring_options: null,
  };

  const allTasks = [template1, template2, occurrence];
  const foundTemplate = findTemplateFromInstance(occurrence, allTasks);

  assert(foundTemplate !== null, 'Should find template');
  assertEqual(foundTemplate?.id, template1.id, 'Should find template for correct user');
  assertEqual(foundTemplate?.user_id, 'user-1', 'Should match user_id');
});

// ============================================================================
// SECTION 5: Real-World Scenario Tests
// ============================================================================

section('5. Real-World Scenario Tests');

test('5.1: Complete flow: template creates occurrences with deadline in title', () => {
  const templateTitle = 'Weekly Review Meeting';
  const deadline1 = new Date('2025-01-15');
  const deadline2 = new Date('2025-01-22');

  const title1 = formatOccurrenceTitle(templateTitle, deadline1);
  const title2 = formatOccurrenceTitle(templateTitle, deadline2);

  assertEqual(title1, 'Weekly Review Meeting - 01/15/2025', 
    'First occurrence should have deadline in title');
  assertEqual(title2, 'Weekly Review Meeting - 01/22/2025', 
    'Second occurrence should have different deadline in title');

  // Both should have same base title
  const base1 = extractBaseTitle(title1);
  const base2 = extractBaseTitle(title2);
  assertEqual(base1, base2, 'Both should have same base title');
  assertEqual(base1, templateTitle, 'Base title should match template');
});

test('5.2: Occurrences can be matched to template even with different dates', () => {
  const template: Task = {
    id: 'template-1',
    title: 'Monthly Report',
    user_id: 'user-1',
    recurring_options: { type: 'monthly_date' } as any,
  } as Task;

  const occurrences = [
    { deadline: new Date('2025-01-15'), expectedTitle: 'Monthly Report - 01/15/2025' },
    { deadline: new Date('2025-02-15'), expectedTitle: 'Monthly Report - 02/15/2025' },
    { deadline: new Date('2025-03-15'), expectedTitle: 'Monthly Report - 03/15/2025' },
  ].map((occ, index) => ({
    ...template,
    id: `occ-${index}`,
    title: formatOccurrenceTitle(template.title, occ.deadline),
    deadline: occ.deadline.toISOString(),
    recurring_options: null,
  } as Task));

  const allTasks = [template, ...occurrences];
  const foundInstances = findAllInstancesFromTemplate(template, allTasks);

  assertEqual(foundInstances.length, 3, 'Should find all 3 occurrences');
  for (const instance of foundInstances) {
    const baseTitle = extractBaseTitle(instance.title);
    assertEqual(baseTitle, template.title, 
      `Instance ${instance.id} should match template base title`);
  }
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
      console.log(`\n  Section ${r.section}, Test ${r.testNumber}: ${r.name}`);
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

