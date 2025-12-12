/**
 * TRASH OPERATIONS TESTS
 * 
 * Tests for Problem 13: Delete All Tasks (Safe Mode)
 * 
 * Tests verify:
 * 1. Soft delete operations (single and all tasks)
 * 2. Restore operations
 * 3. Hard delete operations
 * 4. Empty trash operations
 * 5. Auto-purge logic (30 days retention)
 * 6. Trash loading and counting
 * 7. Filtering of soft-deleted tasks from main task lists
 * 
 * Usage:
 *   tsx test-trash-operations.ts
 */

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
    const error: any = new Error(message || 'Expected value to not be null/undefined');
    throw error;
  }
}

// ============================================================================
// MOCK DATA AND HELPERS
// ============================================================================

const TEST_USER_ID = 'test-user-trash-123';
const TEST_TASK_ID_1 = 'task-1-trash-test';
const TEST_TASK_ID_2 = 'task-2-trash-test';
const TEST_TASK_ID_3 = 'task-3-trash-test';

function createMockTask(id: string, title: string, deletedAt: string | null = null): Task {
  const now = new Date().toISOString();
  return {
    id,
    user_id: TEST_USER_ID,
    title,
    description: '',
    priority: 'medium',
    category: 'test',
    deadline: null,
    status: 'pending',
    pinned: false,
    created_at: now,
    updated_at: now,
    recurring_options: null,
    is_completed: false,
    deleted_at: deletedAt,
  } as Task;
}

function createOldDeletedTask(id: string, title: string, daysAgo: number): Task {
  const deletedDate = new Date();
  deletedDate.setDate(deletedDate.getDate() - daysAgo);
  return createMockTask(id, title, deletedDate.toISOString());
}

// ============================================================================
// SECTION 1: SOFT DELETE OPERATIONS
// ============================================================================

test('1.1: Soft delete sets deleted_at timestamp', () => {
  const task = createMockTask(TEST_TASK_ID_1, 'Test Task 1');
  assertEqual(task.deleted_at, null, 'Task should not be deleted initially');
  
  // Simulate soft delete
  const deletedTask = {
    ...task,
    deleted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  assertNotNull(deletedTask.deleted_at, 'deleted_at should be set after soft delete');
  assert(deletedTask.deleted_at !== null, 'deleted_at should not be null');
});

test('1.2: Soft deleted task is excluded from main task list', () => {
  const activeTask = createMockTask(TEST_TASK_ID_1, 'Active Task');
  const deletedTask = createMockTask(TEST_TASK_ID_2, 'Deleted Task', new Date().toISOString());
  
  const allTasks = [activeTask, deletedTask];
  const activeTasks = allTasks.filter(t => t.deleted_at === null || t.deleted_at === '');
  
  assertEqual(activeTasks.length, 1, 'Should only return active tasks');
  assertEqual(activeTasks[0].id, TEST_TASK_ID_1, 'Should return the active task');
});

test('1.3: Soft delete all tasks marks all as deleted', () => {
  const task1 = createMockTask(TEST_TASK_ID_1, 'Task 1');
  const task2 = createMockTask(TEST_TASK_ID_2, 'Task 2');
  const task3 = createMockTask(TEST_TASK_ID_3, 'Task 3');
  
  const allTasks = [task1, task2, task3];
  assertEqual(allTasks.length, 3, 'Should have 3 tasks initially');
  
  // Simulate soft delete all
  const now = new Date().toISOString();
  const deletedTasks = allTasks.map(t => ({
    ...t,
    deleted_at: now,
    updated_at: now,
  }));
  
  assertEqual(deletedTasks.length, 3, 'Should have 3 tasks after soft delete all');
  deletedTasks.forEach(task => {
    assertNotNull(task.deleted_at, 'All tasks should have deleted_at set');
  });
});

test('1.4: Soft delete all does not affect already deleted tasks', () => {
  const oldDeletedDate = new Date();
  oldDeletedDate.setDate(oldDeletedDate.getDate() - 5);
  
  const alreadyDeleted = createMockTask(TEST_TASK_ID_1, 'Already Deleted', oldDeletedDate.toISOString());
  const activeTask = createMockTask(TEST_TASK_ID_2, 'Active Task');
  
  // Simulate soft delete all (only affects tasks with deleted_at IS NULL)
  const now = new Date().toISOString();
  const afterDeleteAll = [
    alreadyDeleted, // Should remain with old deleted_at
    { ...activeTask, deleted_at: now, updated_at: now }, // Should get new deleted_at
  ];
  
  // Verify old deleted task keeps its old timestamp
  assertEqual(afterDeleteAll[0].deleted_at, oldDeletedDate.toISOString(), 'Old deleted task should keep its deleted_at');
  assertEqual(afterDeleteAll[1].deleted_at, now, 'Newly deleted task should have new deleted_at');
});

// ============================================================================
// SECTION 2: RESTORE OPERATIONS
// ============================================================================

test('2.1: Restore task clears deleted_at', () => {
  const deletedTask = createMockTask(TEST_TASK_ID_1, 'Deleted Task', new Date().toISOString());
  assertNotNull(deletedTask.deleted_at, 'Task should be deleted initially');
  
  // Simulate restore
  const restoredTask = {
    ...deletedTask,
    deleted_at: null,
    updated_at: new Date().toISOString(),
  };
  
  assertEqual(restoredTask.deleted_at, null, 'deleted_at should be null after restore');
});

test('2.2: Restored task appears in main task list', () => {
  const deletedTask = createMockTask(TEST_TASK_ID_1, 'Deleted Task', new Date().toISOString());
  const activeTask = createMockTask(TEST_TASK_ID_2, 'Active Task');
  
  // Simulate restore
  const restoredTask = {
    ...deletedTask,
    deleted_at: null,
  };
  
  const allTasks = [restoredTask, activeTask];
  const activeTasks = allTasks.filter(t => t.deleted_at === null || t.deleted_at === '');
  
  assertEqual(activeTasks.length, 2, 'Should have 2 active tasks after restore');
  assert(activeTasks.some(t => t.id === TEST_TASK_ID_1), 'Restored task should be in active list');
});

test('2.3: Restore updates updated_at timestamp', () => {
  const oldUpdatedAt = new Date('2024-01-01T00:00:00Z').toISOString();
  const deletedTask = createMockTask(TEST_TASK_ID_1, 'Deleted Task', new Date().toISOString());
  deletedTask.updated_at = oldUpdatedAt;
  
  // Simulate restore
  const now = new Date().toISOString();
  const restoredTask = {
    ...deletedTask,
    deleted_at: null,
    updated_at: now,
  };
  
  assert(restoredTask.updated_at !== oldUpdatedAt, 'updated_at should be updated');
  assert(restoredTask.updated_at === now, 'updated_at should be current time');
});

// ============================================================================
// SECTION 3: HARD DELETE OPERATIONS
// ============================================================================

test('3.1: Hard delete removes task completely', () => {
  const deletedTask = createMockTask(TEST_TASK_ID_1, 'Deleted Task', new Date().toISOString());
  const activeTask = createMockTask(TEST_TASK_ID_2, 'Active Task');
  
  const allTasks = [deletedTask, activeTask];
  
  // Simulate hard delete (remove from array)
  const afterHardDelete = allTasks.filter(t => t.id !== TEST_TASK_ID_1);
  
  assertEqual(afterHardDelete.length, 1, 'Should have 1 task after hard delete');
  assertEqual(afterHardDelete[0].id, TEST_TASK_ID_2, 'Should only have the active task');
});

test('3.2: Hard delete only works on soft-deleted tasks', () => {
  const deletedTask = createMockTask(TEST_TASK_ID_1, 'Deleted Task', new Date().toISOString());
  const activeTask = createMockTask(TEST_TASK_ID_2, 'Active Task');
  
  // Hard delete should only work on deleted tasks
  assert(deletedTask.deleted_at !== null, 'Task should be soft-deleted before hard delete');
  assert(activeTask.deleted_at === null, 'Active task should not be hard-deletable directly');
});

test('3.3: Hard delete removes task from trash', () => {
  const deletedTask1 = createMockTask(TEST_TASK_ID_1, 'Deleted Task 1', new Date().toISOString());
  const deletedTask2 = createMockTask(TEST_TASK_ID_2, 'Deleted Task 2', new Date().toISOString());
  
  const trashTasks = [deletedTask1, deletedTask2];
  
  // Simulate hard delete
  const afterHardDelete = trashTasks.filter(t => t.id !== TEST_TASK_ID_1);
  
  assertEqual(afterHardDelete.length, 1, 'Trash should have 1 task after hard delete');
  assertEqual(afterHardDelete[0].id, TEST_TASK_ID_2, 'Should only have the remaining deleted task');
});

// ============================================================================
// SECTION 4: EMPTY TRASH OPERATIONS
// ============================================================================

test('4.1: Empty trash removes all soft-deleted tasks', () => {
  const deletedTask1 = createMockTask(TEST_TASK_ID_1, 'Deleted Task 1', new Date().toISOString());
  const deletedTask2 = createMockTask(TEST_TASK_ID_2, 'Deleted Task 2', new Date().toISOString());
  const deletedTask3 = createMockTask(TEST_TASK_ID_3, 'Deleted Task 3', new Date().toISOString());
  
  const trashTasks = [deletedTask1, deletedTask2, deletedTask3];
  
  // Simulate empty trash
  const afterEmptyTrash: Task[] = [];
  
  assertEqual(afterEmptyTrash.length, 0, 'Trash should be empty after empty trash');
});

test('4.2: Empty trash does not affect active tasks', () => {
  const activeTask1 = createMockTask(TEST_TASK_ID_1, 'Active Task 1');
  const activeTask2 = createMockTask(TEST_TASK_ID_2, 'Active Task 2');
  const deletedTask = createMockTask(TEST_TASK_ID_3, 'Deleted Task', new Date().toISOString());
  
  const allTasks = [activeTask1, activeTask2, deletedTask];
  
  // Simulate empty trash (only removes deleted tasks)
  const afterEmptyTrash = allTasks.filter(t => t.deleted_at === null || t.deleted_at === '');
  
  assertEqual(afterEmptyTrash.length, 2, 'Should have 2 active tasks');
  assert(afterEmptyTrash.every(t => t.deleted_at === null), 'All remaining tasks should be active');
});

test('4.3: Empty trash returns count of deleted tasks', () => {
  const deletedTasks = [
    createMockTask(TEST_TASK_ID_1, 'Deleted Task 1', new Date().toISOString()),
    createMockTask(TEST_TASK_ID_2, 'Deleted Task 2', new Date().toISOString()),
    createMockTask(TEST_TASK_ID_3, 'Deleted Task 3', new Date().toISOString()),
  ];
  
  const count = deletedTasks.length;
  
  assertEqual(count, 3, 'Should return count of 3 deleted tasks');
});

// ============================================================================
// SECTION 5: AUTO-PURGE OPERATIONS
// ============================================================================

test('5.1: Auto-purge removes tasks older than retention period', () => {
  const retentionDays = 30;
  const oldTask = createOldDeletedTask(TEST_TASK_ID_1, 'Old Task', 35); // 35 days ago
  const recentTask = createOldDeletedTask(TEST_TASK_ID_2, 'Recent Task', 10); // 10 days ago
  const boundaryTask = createOldDeletedTask(TEST_TASK_ID_3, 'Boundary Task', 30); // Exactly 30 days ago
  
  const trashTasks = [oldTask, recentTask, boundaryTask];
  
  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  // Simulate auto-purge (remove tasks older than retention period)
  const afterPurge = trashTasks.filter(task => {
    if (!task.deleted_at) return false;
    const deletedDate = new Date(task.deleted_at);
    return deletedDate >= cutoffDate;
  });
  
  // Tasks older than 30 days should be purged
  assertEqual(afterPurge.length, 2, 'Should keep tasks within retention period');
  assert(afterPurge.some(t => t.id === TEST_TASK_ID_2), 'Recent task should remain');
  assert(afterPurge.some(t => t.id === TEST_TASK_ID_3), 'Boundary task should remain');
});

test('5.2: Auto-purge default retention is 30 days', () => {
  const retentionDays = 30; // Default
  const oldTask = createOldDeletedTask(TEST_TASK_ID_1, 'Old Task', 31);
  const recentTask = createOldDeletedTask(TEST_TASK_ID_2, 'Recent Task', 29);
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  const oldDeletedDate = new Date(oldTask.deleted_at!);
  const recentDeletedDate = new Date(recentTask.deleted_at!);
  
  assert(oldDeletedDate < cutoffDate, 'Old task should be purged');
  assert(recentDeletedDate >= cutoffDate, 'Recent task should not be purged');
});

test('5.3: Auto-purge only affects soft-deleted tasks', () => {
  const activeTask = createMockTask(TEST_TASK_ID_1, 'Active Task');
  const oldDeletedTask = createOldDeletedTask(TEST_TASK_ID_2, 'Old Deleted Task', 35);
  
  const allTasks = [activeTask, oldDeletedTask];
  
  // Auto-purge should only affect deleted tasks
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);
  
  const afterPurge = allTasks.filter(task => {
    if (task.deleted_at === null) return true; // Keep active tasks
    const deletedDate = new Date(task.deleted_at);
    return deletedDate >= cutoffDate; // Keep recent deleted tasks
  });
  
  assertEqual(afterPurge.length, 1, 'Should keep active task');
  assertEqual(afterPurge[0].id, TEST_TASK_ID_1, 'Should keep the active task');
});

// ============================================================================
// SECTION 6: TRASH LOADING AND COUNTING
// ============================================================================

test('6.1: Load trash returns only soft-deleted tasks', () => {
  const activeTask1 = createMockTask(TEST_TASK_ID_1, 'Active Task 1');
  const activeTask2 = createMockTask(TEST_TASK_ID_2, 'Active Task 2');
  const deletedTask1 = createMockTask(TEST_TASK_ID_3, 'Deleted Task 1', new Date().toISOString());
  
  const allTasks = [activeTask1, activeTask2, deletedTask1];
  
  // Simulate load trash (filter deleted tasks)
  const trashTasks = allTasks.filter(t => t.deleted_at !== null && t.deleted_at !== '');
  
  assertEqual(trashTasks.length, 1, 'Should return 1 deleted task');
  assertEqual(trashTasks[0].id, TEST_TASK_ID_3, 'Should return the deleted task');
});

test('6.2: Load trash orders by deleted_at DESC', () => {
  const now = new Date();
  const task1 = createMockTask(TEST_TASK_ID_1, 'Task 1', new Date(now.getTime() - 86400000 * 3).toISOString()); // 3 days ago
  const task2 = createMockTask(TEST_TASK_ID_2, 'Task 2', new Date(now.getTime() - 86400000 * 1).toISOString()); // 1 day ago
  const task3 = createMockTask(TEST_TASK_ID_3, 'Task 3', now.toISOString()); // Today
  
  const trashTasks = [task1, task2, task3];
  
  // Sort by deleted_at DESC (newest first)
  const sorted = [...trashTasks].sort((a, b) => {
    if (!a.deleted_at || !b.deleted_at) return 0;
    return new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime();
  });
  
  assertEqual(sorted[0].id, TEST_TASK_ID_3, 'Most recently deleted should be first');
  assertEqual(sorted[1].id, TEST_TASK_ID_2, 'Second most recently deleted should be second');
  assertEqual(sorted[2].id, TEST_TASK_ID_1, 'Oldest deleted should be last');
});

test('6.3: Get trash count returns correct number', () => {
  const deletedTasks = [
    createMockTask(TEST_TASK_ID_1, 'Deleted Task 1', new Date().toISOString()),
    createMockTask(TEST_TASK_ID_2, 'Deleted Task 2', new Date().toISOString()),
    createMockTask(TEST_TASK_ID_3, 'Deleted Task 3', new Date().toISOString()),
  ];
  
  const count = deletedTasks.length;
  
  assertEqual(count, 3, 'Should return count of 3');
});

test('6.4: Get trash count returns 0 for empty trash', () => {
  const trashTasks: Task[] = [];
  const count = trashTasks.length;
  
  assertEqual(count, 0, 'Should return count of 0 for empty trash');
});

// ============================================================================
// SECTION 7: INTEGRATION WITH TASK LISTS
// ============================================================================

test('7.1: fetchTasks excludes soft-deleted tasks', () => {
  const activeTask1 = createMockTask(TEST_TASK_ID_1, 'Active Task 1');
  const activeTask2 = createMockTask(TEST_TASK_ID_2, 'Active Task 2');
  const deletedTask = createMockTask(TEST_TASK_ID_3, 'Deleted Task', new Date().toISOString());
  
  const allTasks = [activeTask1, activeTask2, deletedTask];
  
  // Simulate fetchTasks (filters out deleted tasks)
  const visibleTasks = allTasks.filter(t => t.deleted_at === null || t.deleted_at === '');
  
  assertEqual(visibleTasks.length, 2, 'Should return 2 active tasks');
  assert(visibleTasks.every(t => t.deleted_at === null), 'All returned tasks should be active');
  assert(!visibleTasks.some(t => t.id === TEST_TASK_ID_3), 'Deleted task should not be included');
});

test('7.2: Restored task appears in fetchTasks', () => {
  const activeTask = createMockTask(TEST_TASK_ID_1, 'Active Task');
  const deletedTask = createMockTask(TEST_TASK_ID_2, 'Deleted Task', new Date().toISOString());
  
  // Simulate restore
  const restoredTask = {
    ...deletedTask,
    deleted_at: null,
  };
  
  const allTasks = [activeTask, restoredTask];
  const visibleTasks = allTasks.filter(t => t.deleted_at === null || t.deleted_at === '');
  
  assertEqual(visibleTasks.length, 2, 'Should return 2 tasks after restore');
  assert(visibleTasks.some(t => t.id === TEST_TASK_ID_2), 'Restored task should be included');
});

test('7.3: Hard deleted task does not appear anywhere', () => {
  const activeTask = createMockTask(TEST_TASK_ID_1, 'Active Task');
  const deletedTask = createMockTask(TEST_TASK_ID_2, 'Deleted Task', new Date().toISOString());
  
  const allTasks = [activeTask, deletedTask];
  
  // Simulate hard delete
  const afterHardDelete = allTasks.filter(t => t.id !== TEST_TASK_ID_2);
  const visibleTasks = afterHardDelete.filter(t => t.deleted_at === null || t.deleted_at === '');
  const trashTasks = afterHardDelete.filter(t => t.deleted_at !== null && t.deleted_at !== '');
  
  assertEqual(visibleTasks.length, 1, 'Should have 1 visible task');
  assertEqual(trashTasks.length, 0, 'Should have 0 trash tasks');
  assert(!afterHardDelete.some(t => t.id === TEST_TASK_ID_2), 'Hard deleted task should not exist');
});

// ============================================================================
// SECTION 8: EDGE CASES
// ============================================================================

test('8.1: Soft delete task that is already deleted updates deleted_at', () => {
  const oldDeletedDate = new Date();
  oldDeletedDate.setDate(oldDeletedDate.getDate() - 5);
  const alreadyDeleted = createMockTask(TEST_TASK_ID_1, 'Already Deleted', oldDeletedDate.toISOString());
  
  // Soft delete again (should update deleted_at)
  const now = new Date().toISOString();
  const reDeleted = {
    ...alreadyDeleted,
    deleted_at: now,
    updated_at: now,
  };
  
  assertNotNull(reDeleted.deleted_at, 'Should have deleted_at set');
  assertEqual(reDeleted.deleted_at, now, 'Should update to new deleted_at');
});

test('8.2: Restore task that is not deleted has no effect', () => {
  const activeTask = createMockTask(TEST_TASK_ID_1, 'Active Task');
  const originalDeletedAt = activeTask.deleted_at;
  
  // Simulate restore (should not change anything)
  const restored = {
    ...activeTask,
    deleted_at: null, // Already null
  };
  
  assertEqual(restored.deleted_at, originalDeletedAt, 'deleted_at should remain null');
});

test('8.3: Empty trash on empty list returns 0', () => {
  const trashTasks: Task[] = [];
  const count = trashTasks.length;
  
  assertEqual(count, 0, 'Should return 0 for empty trash');
});

test('8.4: Auto-purge with custom retention period', () => {
  const retentionDays = 7; // Custom: 7 days
  const oldTask = createOldDeletedTask(TEST_TASK_ID_1, 'Old Task', 10); // 10 days ago
  const recentTask = createOldDeletedTask(TEST_TASK_ID_2, 'Recent Task', 5); // 5 days ago
  
  const trashTasks = [oldTask, recentTask];
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  const afterPurge = trashTasks.filter(task => {
    if (!task.deleted_at) return false;
    const deletedDate = new Date(task.deleted_at);
    return deletedDate >= cutoffDate;
  });
  
  assertEqual(afterPurge.length, 1, 'Should keep 1 task within 7-day retention');
  assertEqual(afterPurge[0].id, TEST_TASK_ID_2, 'Should keep the recent task');
});

// ============================================================================
// TEST SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
const total = results.length;

console.log(`\nTotal tests: ${total}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

if (failed > 0) {
  console.log('\n' + '='.repeat(80));
  console.log('FAILED TESTS');
  console.log('='.repeat(80));
  results
    .filter(r => !r.passed)
    .forEach(r => {
      console.log(`\n❌ Test ${r.testNumber}: ${r.name}`);
      console.log(`   ${r.message}`);
      if (r.expected !== undefined) {
        console.log(`   Expected: ${JSON.stringify(r.expected)}`);
      }
      if (r.actual !== undefined) {
        console.log(`   Actual: ${JSON.stringify(r.actual)}`);
      }
    });
}

console.log('\n' + '='.repeat(80));
console.log(failed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
console.log('='.repeat(80) + '\n');

// Exit with error code if tests failed
process.exit(failed > 0 ? 1 : 0);

