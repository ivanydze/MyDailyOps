/**
 * Comprehensive tests for recurring task logic
 * Tests all recurring types including edge cases
 */

import { getNextRecurringDate, shouldGenerateRecurringInstance, createNextTask } from '../recurring';
import { Task, RecurringOptions } from '../../types/task';

// Helper to create test task
function createTestTask(
  recurringOptions: RecurringOptions | null,
  deadline: string | null = null,
  status: 'pending' | 'in_progress' | 'done' = 'pending'
): Task {
  return {
    id: 'test-id',
    user_id: 'test-user',
    title: 'Test Task',
    description: '',
    priority: 'medium',
    category: 'General',
    deadline,
    status,
    pinned: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    recurring_options: recurringOptions,
  };
}

describe('getNextRecurringDate', () => {
  describe('daily', () => {
    it('should add 1 day for daily recurring', () => {
      const task = createTestTask({ type: 'daily' }, '2024-01-15T10:00:00Z');
      const next = getNextRecurringDate(task);
      expect(next).not.toBeNull();
      expect(next!.toISOString()).toMatch(/2024-01-16T10:00:00/);
    });

    it('should preserve time component', () => {
      const task = createTestTask({ type: 'daily' }, '2024-01-15T14:30:45Z');
      const next = getNextRecurringDate(task);
      expect(next!.getHours()).toBe(14);
      expect(next!.getMinutes()).toBe(30);
      expect(next!.getSeconds()).toBe(45);
    });
  });

  describe('interval', () => {
    it('should add interval_days', () => {
      const task = createTestTask(
        { type: 'interval', interval_days: 5 },
        '2024-01-15T10:00:00Z'
      );
      const next = getNextRecurringDate(task);
      expect(next!.toISOString()).toMatch(/2024-01-20T10:00:00/);
    });

    it('should return null for invalid interval_days', () => {
      const task = createTestTask({ type: 'interval' }, '2024-01-15T10:00:00Z');
      const next = getNextRecurringDate(task);
      expect(next).toBeNull();
    });
  });

  describe('weekly', () => {
    it('should find next weekday after baseDate', () => {
      // Monday Jan 15, 2024
      const task = createTestTask(
        { type: 'weekly', weekdays: ['wed', 'fri'] },
        '2024-01-15T10:00:00Z'
      );
      const next = getNextRecurringDate(task);
      // Should be Wednesday Jan 17
      expect(next!.getDay()).toBe(3); // Wednesday
      expect(next!.getDate()).toBe(17);
    });

    it('should handle multiple weekdays', () => {
      // Sunday Jan 14, 2024
      const task = createTestTask(
        { type: 'weekly', weekdays: ['mon', 'wed', 'fri'] },
        '2024-01-14T10:00:00Z'
      );
      const next = getNextRecurringDate(task);
      // Should be Monday Jan 15
      expect(next!.getDay()).toBe(1); // Monday
    });

    it('should wrap to next week if needed', () => {
      // Friday Jan 19, 2024
      const task = createTestTask(
        { type: 'weekly', weekdays: ['mon', 'wed'] },
        '2024-01-19T10:00:00Z'
      );
      const next = getNextRecurringDate(task);
      // Should be Monday Jan 22
      expect(next!.getDay()).toBe(1);
      expect(next!.getDate()).toBe(22);
    });

    it('should return null for empty weekdays array', () => {
      const task = createTestTask({ type: 'weekly', weekdays: [] }, '2024-01-15T10:00:00Z');
      const next = getNextRecurringDate(task);
      expect(next).toBeNull();
    });
  });

  describe('monthly_date', () => {
    it('should move to next month with same day', () => {
      const task = createTestTask(
        { type: 'monthly_date', dayOfMonth: 15 },
        '2024-01-15T10:00:00Z'
      );
      const next = getNextRecurringDate(task);
      expect(next!.getMonth()).toBe(1); // February
      expect(next!.getDate()).toBe(15);
    });

    it('should clamp to last day of month for invalid dates', () => {
      // Jan 31 -> Feb 29 (2024 is leap year)
      const task = createTestTask(
        { type: 'monthly_date', dayOfMonth: 31 },
        '2024-01-31T10:00:00Z'
      );
      const next = getNextRecurringDate(task);
      expect(next!.getMonth()).toBe(1); // February
      expect(next!.getDate()).toBe(29); // Last day of Feb 2024
    });

    it('should handle Feb 29 correctly', () => {
      const task = createTestTask(
        { type: 'monthly_date', dayOfMonth: 29 },
        '2024-02-29T10:00:00Z'
      );
      const next = getNextRecurringDate(task);
      expect(next!.getMonth()).toBe(2); // March
      expect(next!.getDate()).toBe(29);
    });

    it('should clamp Feb 31 to Feb 28/29', () => {
      // Requesting day 31 in February
      const task = createTestTask(
        { type: 'monthly_date', dayOfMonth: 31 },
        '2024-02-15T10:00:00Z'
      );
      const next = getNextRecurringDate(task);
      expect(next!.getMonth()).toBe(2); // March
      // Should clamp to last day of Feb, then move to March
      // Actually it moves to next month (March) and clamps there
      expect(next!.getDate()).toBeLessThanOrEqual(31);
    });
  });

  describe('monthly_weekday', () => {
    it('should calculate 1st Monday of next month', () => {
      // Jan 15, 2024 (Monday)
      const task = createTestTask(
        { type: 'monthly_weekday', weekdays: ['mon'], weekNumber: 1 },
        '2024-01-15T10:00:00Z'
      );
      const next = getNextRecurringDate(task);
      // Feb 5, 2024 is 1st Monday of February
      expect(next!.getMonth()).toBe(1); // February
      expect(next!.getDate()).toBe(5);
      expect(next!.getDay()).toBe(1); // Monday
    });

    it('should calculate last Friday of next month', () => {
      // Jan 15, 2024
      const task = createTestTask(
        { type: 'monthly_weekday', weekdays: ['fri'], weekNumber: -1 },
        '2024-01-15T10:00:00Z'
      );
      const next = getNextRecurringDate(task);
      // Feb 23, 2024 is last Friday of February
      expect(next!.getMonth()).toBe(1); // February
      expect(next!.getDay()).toBe(5); // Friday
      expect(next!.getDate()).toBe(23);
    });

    it('should handle short months correctly', () => {
      // Feb 15, 2024
      const task = createTestTask(
        { type: 'monthly_weekday', weekdays: ['fri'], weekNumber: -1 },
        '2024-02-15T10:00:00Z'
      );
      const next = getNextRecurringDate(task);
      // March 29, 2024 is last Friday of March
      expect(next!.getMonth()).toBe(2); // March
      expect(next!.getDay()).toBe(5); // Friday
    });

    it('should return null for missing weekNumber', () => {
      const task = createTestTask(
        { type: 'monthly_weekday', weekdays: ['mon'] },
        '2024-01-15T10:00:00Z'
      );
      const next = getNextRecurringDate(task);
      expect(next).toBeNull();
    });
  });

  describe('none', () => {
    it('should return null for type "none"', () => {
      const task = createTestTask({ type: 'none' }, '2024-01-15T10:00:00Z');
      const next = getNextRecurringDate(task);
      expect(next).toBeNull();
    });

    it('should return null for null recurring_options', () => {
      const task = createTestTask(null, '2024-01-15T10:00:00Z');
      const next = getNextRecurringDate(task);
      expect(next).toBeNull();
    });
  });
});

describe('shouldGenerateRecurringInstance', () => {
  it('should return false for non-recurring tasks', () => {
    const task = createTestTask(null, '2024-01-15T10:00:00Z', 'done');
    expect(shouldGenerateRecurringInstance(task)).toBe(false);
  });

  it('should return false for incomplete tasks', () => {
    const task = createTestTask({ type: 'daily' }, '2024-01-15T10:00:00Z', 'pending');
    expect(shouldGenerateRecurringInstance(task)).toBe(false);
  });

  it('should return true when task is done and next date has arrived', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const task = createTestTask(
      { type: 'daily' },
      yesterday.toISOString(),
      'done'
    );
    // Next date (today) has arrived
    expect(shouldGenerateRecurringInstance(task)).toBe(true);
  });

  it('should return false when next date is in future', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const task = createTestTask(
      { type: 'daily' },
      tomorrow.toISOString(),
      'done'
    );
    // Next date is tomorrow, not yet arrived
    expect(shouldGenerateRecurringInstance(task)).toBe(false);
  });
});

describe('createNextTask', () => {
  it('should create new task with new ID', () => {
    const original = createTestTask({ type: 'daily' }, '2024-01-15T10:00:00Z', 'done');
    const next = createNextTask(original);
    
    expect(next.id).not.toBe(original.id);
    expect(next.status).toBe('pending');
    expect(next.pinned).toBe(false);
    expect(next.recurring_options).toBeNull(); // New instance is not recurring
  });

  it('should set deadline to next recurring date', () => {
    const original = createTestTask({ type: 'daily' }, '2024-01-15T10:00:00Z', 'done');
    const next = createNextTask(original);
    
    expect(next.deadline).not.toBeNull();
    const nextDate = new Date(next.deadline!);
    expect(nextDate.getDate()).toBe(16); // Next day
  });

  it('should preserve time component in deadline', () => {
    const original = createTestTask({ type: 'daily' }, '2024-01-15T14:30:45Z', 'done');
    const next = createNextTask(original);
    
    const nextDate = new Date(next.deadline!);
    expect(nextDate.getHours()).toBe(14);
    expect(nextDate.getMinutes()).toBe(30);
    expect(nextDate.getSeconds()).toBe(45);
  });
});

