import { Task } from '../types/task';
import {
  startOfDay,
  isBefore,
  isSameDay,
  isAfter,
  endOfWeek,
  startOfWeek,
  addDays,
  addWeeks,
  parseISO,
} from 'date-fns';
import { isVisibleToday } from './visibility';

export interface GroupedTasks {
  overdue: Task[];
  today: Task[];
  tomorrow: Task[];
  thisWeek: Task[];
  nextWeek: Task[];
  future: Task[];
  completed?: Task[]; // Optional: for completed tasks
}

/**
 * Group tasks by their deadline date
 * @param tasks Array of tasks to group
 * @returns Grouped tasks by date ranges
 */
export function groupTasksByDate(tasks: Task[]): GroupedTasks {
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const dayAfterTomorrow = addDays(today, 2); // tomorrow + 1
  
  // End of current week (Sunday)
  const endOfThisWeek = endOfWeek(today, { weekStartsOn: 1 }); // Monday = start of week
  
  // Start and end of next week
  const startOfNextWeek = addWeeks(startOfWeek(today, { weekStartsOn: 1 }), 1);
  const endOfNextWeek = endOfWeek(startOfNextWeek, { weekStartsOn: 1 });

  const groups: GroupedTasks = {
    overdue: [],
    today: [],
    tomorrow: [],
    thisWeek: [],
    nextWeek: [],
    future: [],
  };

  for (const task of tasks) {
    // Skip completed tasks
    if (task.status === 'done') {
      continue;
    }

    // Check visibility using visibility engine (Problem 5)
    const visibleFrom = (task as any).visible_from;
    const visibleUntil = (task as any).visible_until;
    const isTaskVisibleToday = isVisibleToday(visibleFrom, visibleUntil);

    // If task has visibility fields and is not visible today, skip it
    // (unless it's overdue, which we handle separately)
    if ((visibleFrom || visibleUntil) && !isTaskVisibleToday) {
      // Check if task is overdue (deadline in past but still visible due to duration)
      // Overdue tasks should still appear in overdue group
      if (task.deadline) {
        try {
          const deadlineDate = parseISO(task.deadline);
          const deadlineDay = startOfDay(deadlineDate);
          // If deadline is in the past, it might be overdue even if not visible today
          if (isBefore(deadlineDay, today)) {
            // Check if it's within visibility window (overdue but still visible)
            // This is an edge case - task deadline passed but visibility extends into today
            // For now, skip if not visible today (can be refined later)
            continue;
          }
        } catch (error) {
          // Skip if deadline parsing fails
          continue;
        }
      }
      continue;
    }

    try {
      // For grouping, we still need deadline for overdue detection
      // Tasks without deadline but with visibility are handled separately
      if (!task.deadline) {
        // Task without deadline - if visible today, add to today group
        if (isTaskVisibleToday || (!visibleFrom && !visibleUntil)) {
          groups.today.push(task);
        }
        continue;
      }

      const deadlineDate = parseISO(task.deadline);
      const deadlineDay = startOfDay(deadlineDate);

      // Overdue: deadline < today
      if (isBefore(deadlineDay, today)) {
        groups.overdue.push(task);
      }
      // Today: task is visible today (uses visibility engine)
      else if (isTaskVisibleToday || (!visibleFrom && !visibleUntil && isSameDay(deadlineDay, today))) {
        groups.today.push(task);
      }
      // Tomorrow: deadline = today + 1
      else if (isSameDay(deadlineDay, tomorrow)) {
        groups.tomorrow.push(task);
      }
      // This Week: from tomorrow+1 (day after tomorrow) until end of current week
      // deadlineDay >= dayAfterTomorrow && deadlineDay <= endOfThisWeek
      else if (
        (isSameDay(deadlineDay, dayAfterTomorrow) || isAfter(deadlineDay, dayAfterTomorrow)) &&
        (isSameDay(deadlineDay, endOfThisWeek) || isBefore(deadlineDay, addDays(endOfThisWeek, 1)))
      ) {
        groups.thisWeek.push(task);
      }
      // Next Week: next week's Monday → Sunday (inclusive)
      // deadlineDay >= startOfNextWeek && deadlineDay <= endOfNextWeek
      else if (
        (isSameDay(deadlineDay, startOfNextWeek) || isAfter(deadlineDay, startOfNextWeek)) &&
        (isSameDay(deadlineDay, endOfNextWeek) || isBefore(deadlineDay, addDays(endOfNextWeek, 1)))
      ) {
        groups.nextWeek.push(task);
      }
      // Future: anything beyond next week
      else {
        groups.future.push(task);
      }
    } catch (error) {
      console.error('[groupTasksByDate] Error parsing deadline for task:', task.id, error);
      // Skip tasks with invalid dates
      continue;
    }
  }

  return groups;
}

