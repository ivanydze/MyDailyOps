import { useMemo } from 'react';
import { Task } from '../types/task';
import { useSync } from './useSync';

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

      if (!task.deadline) {
        // No deadline - add to upcoming as "someday"
        upcomingTasks.push(task);
        return;
      }

      const deadline = new Date(task.deadline);
      const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());

      if (deadlineDate < today) {
        // Overdue
        overdueTasks.push(task);
      } else if (deadlineDate.getTime() === today.getTime()) {
        // Today
        todayTasks.push(task);
      } else if (deadline < weekEnd) {
        // Upcoming (within the week)
        upcomingTasks.push(task);
      } else {
        // Later - still add to upcoming but limit
        upcomingTasks.push(task);
      }
    });

    // Sort today by deadline time
    todayTasks.sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

    // Sort overdue by how long overdue (oldest first)
    overdueTasks.sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

    // Sort upcoming by deadline
    upcomingTasks.sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
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

