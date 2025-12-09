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
    // Skip completed tasks and tasks without deadlines
    if (task.status === 'done' || !task.deadline) {
      continue;
    }

    try {
      const deadlineDate = parseISO(task.deadline);
      const deadlineDay = startOfDay(deadlineDate);

      // Overdue: deadline < today
      if (isBefore(deadlineDay, today)) {
        groups.overdue.push(task);
      }
      // Today: deadline = today
      else if (isSameDay(deadlineDay, today)) {
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

