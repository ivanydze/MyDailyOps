import { useMemo } from 'react';
import { Task } from '../types/task';
import { useSync } from './useSync';
import { isVisibleToday, isUpcoming } from '../utils/visibility';
import { shouldShowTaskOnWeekend } from '../utils/weekend';
import { useSettingsStore } from '../stores/settingsStore';
import { parseISO, isBefore, startOfDay } from 'date-fns';

export interface DashboardData {
  today: Task[];
  overdue: Task[];
  upcoming: Task[];
  weekly: { completed: number; total: number; percent: number };
  categories: Record<string, number>;
  loading: boolean;
  syncing: boolean;
  refresh: () => Promise<void>;
}

/**
 * Dashboard hook - groups tasks for Motion/Notion style dashboard
 */
export function useDashboard(): DashboardData {
  const { tasks, loading, syncing, refreshTasks, syncTasks } = useSync();
  const weekendFilter = useSettingsStore((state) => state.weekendFilter);

  const dashboardData = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const todayTasks: Task[] = [];
    const overdueTasks: Task[] = [];
    const upcomingTasks: Task[] = [];
    const categories: Record<string, number> = {};

    let weeklyTotal = 0;
    let weeklyCompleted = 0;

    // Filter out completed tasks for active lists, but count for weekly
    tasks.forEach((task) => {
      // Count categories for non-completed tasks
      if (task.status !== 'done') {
        const cat = task.category || 'General';
        categories[cat] = (categories[cat] || 0) + 1;
      }

      // Weekly progress (all tasks with deadline this week)
      if (task.deadline) {
        const deadline = new Date(task.deadline);
        if (deadline >= weekStart && deadline < weekEnd) {
          weeklyTotal++;
          if (task.status === 'done') {
            weeklyCompleted++;
          }
        }
      }

      // Skip completed tasks for today/overdue/upcoming
      if (task.status === 'done') return;

      // Use visibility engine (Problem 4 & 5)
      const visibleFrom = (task as any).visible_from;
      const visibleUntil = (task as any).visible_until;
      const isTaskVisibleToday = isVisibleToday(visibleFrom, visibleUntil);
      const isTaskUpcoming = isUpcoming(visibleFrom, now, 7);

      // Today: tasks visible today (using visibility engine)
      // Problem 8: Apply weekend filtering (Calendar & Upcoming ignore this filter)
      if (isTaskVisibleToday) {
        // Apply weekend filter for Today view
        if (shouldShowTaskOnWeekend(task, weekendFilter)) {
          todayTasks.push(task);
        }
        return; // Don't add to other groups
      }

      // Upcoming: tasks that will become visible in the next 7 days (Problem 4)
      // Formula: visible_from > today && visible_from <= today + 7
      // Problem 8: Upcoming ignores weekend filter (shows all tasks)
      if (isTaskUpcoming) {
        upcomingTasks.push(task);
        return; // Don't add to overdue
      }

      // Overdue: tasks with deadline < today (fallback for legacy tasks without visibility)
      // Note: Tasks with visibility fields that are overdue would have been caught by isVisibleToday
      // if they're still visible. Otherwise, check deadline.
      if (task.deadline) {
        try {
          const deadlineDate = startOfDay(parseISO(task.deadline));
          const todayStart = startOfDay(now);
          if (isBefore(deadlineDate, todayStart)) {
            // Overdue - deadline passed but task might still be visible due to duration
            // If not visible today and not upcoming, it's overdue
            overdueTasks.push(task);
            return;
          }
        } catch (error) {
          // Skip if deadline parsing fails
          console.error('[Dashboard] Error parsing deadline:', error);
        }
      }

      // Legacy: tasks without visibility fields and without deadline
      // Add to upcoming as "someday" (only if no visibility fields)
      if (!visibleFrom && !visibleUntil && !task.deadline) {
        upcomingTasks.push(task);
      }
    });

    // Sort today by deadline time (or visible_from if no deadline)
    todayTasks.sort((a, b) => {
      const aDate = a.deadline ? parseISO(a.deadline).getTime() : 
                    ((a as any).visible_from ? parseISO((a as any).visible_from).getTime() : 0);
      const bDate = b.deadline ? parseISO(b.deadline).getTime() : 
                    ((b as any).visible_from ? parseISO((b as any).visible_from).getTime() : 0);
      return aDate - bDate;
    });

    // Sort overdue by how long overdue (oldest first)
    overdueTasks.sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

    // Sort upcoming by visible_from (when task becomes visible)
    upcomingTasks.sort((a, b) => {
      const aFrom = (a as any).visible_from;
      const bFrom = (b as any).visible_from;
      
      // Sort by visible_from if available (new logic - Problem 4)
      if (aFrom && bFrom) {
        try {
          return parseISO(aFrom).getTime() - parseISO(bFrom).getTime();
        } catch {
          // Fall through to deadline sorting if parsing fails
        }
      }
      
      // Fallback: sort by deadline (legacy)
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      try {
        return parseISO(a.deadline).getTime() - parseISO(b.deadline).getTime();
      } catch {
        return 0;
      }
    });

    const weeklyPercent = weeklyTotal > 0 ? Math.round((weeklyCompleted / weeklyTotal) * 100) : 0;

    return {
      today: todayTasks,
      overdue: overdueTasks,
      upcoming: upcomingTasks.slice(0, 5), // Limit to 5
      weekly: {
        completed: weeklyCompleted,
        total: weeklyTotal,
        percent: weeklyPercent,
      },
      categories,
    };
  }, [tasks]);

  const refresh = async () => {
    await refreshTasks();
    await syncTasks();
  };

  return {
    ...dashboardData,
    loading,
    syncing,
    refresh,
  };
}

/**
 * Get relative time string for deadline
 */
export function getTimeUntil(deadline: string): string {
  const now = new Date();
  const target = new Date(deadline);
  const diff = target.getTime() - now.getTime();

  if (diff < 0) {
    const hours = Math.abs(Math.floor(diff / (1000 * 60 * 60)));
    if (hours < 24) return `${hours}h overdue`;
    const days = Math.floor(hours / 24);
    return `${days}d overdue`;
  }

  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 60) return `${minutes}m`;
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h`;
  
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `${days}d`;
  
  return target.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Get day label for grouping
 */
export function getDayLabel(deadline: string): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(deadline);
  const targetDate = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  
  const diff = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 7) {
    return target.toLocaleDateString(undefined, { weekday: 'long' });
  }
  return target.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

