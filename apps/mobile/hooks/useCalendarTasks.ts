/**
 * Calendar Tasks Hook
 * 
 * React hook that provides calendar-ready task data for a date range
 * Implements Phase 2: React Hook for Calendar Data (Mobile version)
 * 
 * This hook:
 * - Calculates date ranges based on view type (day/week/month/year)
 * - Filters tasks using calendar utilities
 * - Groups tasks by day
 * - Provides loading/error states
 * - Memoizes results for performance
 */

import { useMemo, useState, useEffect } from 'react';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from 'date-fns';
import { useSync } from './useSync';
import { useAuth } from '../contexts/AuthContext';
import {
  getTasksForDateRange,
  groupTasksByDay,
  type DayTaskGroup,
  type CalendarTaskQuery,
} from '../utils/calendar';
import { loadTravelEventsForDateRange } from '../database/travelEvents';

/**
 * Options for useCalendarTasks hook
 */
export interface UseCalendarTasksOptions {
  view: 'day' | 'week' | 'month' | 'year';
  centerDate: Date;              // Center date for the view
  includeCompleted?: boolean;    // Default: false
}

/**
 * Return type for useCalendarTasks hook
 */
export interface UseCalendarTasksReturn {
  dayGroups: DayTaskGroup[];     // Tasks grouped by day
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Calculate start and end dates for a calendar view
 * 
 * @param view View type (day/week/month/year)
 * @param centerDate Center date for the view
 * @returns Object with startDate and endDate
 */
function calculateDateRange(
  view: 'day' | 'week' | 'month' | 'year',
  centerDate: Date
): { startDate: Date; endDate: Date } {
  switch (view) {
    case 'day':
      // Single day: start and end are the same
      return {
        startDate: centerDate,
        endDate: centerDate,
      };

    case 'week':
      // Week view: from start of week to end of week
      return {
        startDate: startOfWeek(centerDate, { weekStartsOn: 0 }), // Sunday = 0
        endDate: endOfWeek(centerDate, { weekStartsOn: 0 }),
      };

    case 'month':
      // Month view: from start of month to end of month
      return {
        startDate: startOfMonth(centerDate),
        endDate: endOfMonth(centerDate),
      };

    case 'year':
      // Year view: from start of year to end of year
      return {
        startDate: startOfYear(centerDate),
        endDate: endOfYear(centerDate),
      };

    default:
      // Fallback to day view
      return {
        startDate: centerDate,
        endDate: centerDate,
      };
  }
}

/**
 * React hook for calendar task data (Mobile version)
 * 
 * Provides tasks grouped by day for a given calendar view and date range.
 * Automatically filters tasks, excludes recurring templates, and groups by day.
 * 
 * Uses mobile-specific hooks: useSync() for tasks, useAuth() for userId
 * 
 * @param options Calendar view options
 * @returns Calendar task data with loading/error states
 */
export function useCalendarTasks(
  options: UseCalendarTasksOptions
): UseCalendarTasksReturn {
  const { view, centerDate, includeCompleted = false } = options;

  // Get tasks and state from mobile sync hook
  const { tasks, loading: tasksLoading, error: tasksError, refreshTasks, syncTasks } = useSync();
  
  // Get userId from auth context
  const { userId } = useAuth();

  // Travel events state (Problem 16)
  const [travelEvents, setTravelEvents] = useState<any[]>([]);
  const [travelEventsLoading, setTravelEventsLoading] = useState(false);

  // Calculate date range based on view and center date
  const dateRange = useMemo(() => {
    return calculateDateRange(view, centerDate);
  }, [view, centerDate]);

  // Load travel events for the date range (Problem 16)
  useEffect(() => {
    if (!userId) {
      setTravelEvents([]);
      return;
    }

    async function loadTravelEvents() {
      setTravelEventsLoading(true);
      try {
        const { startDate, endDate } = dateRange;
        // Format dates as YYYY-MM-DD for database query
        const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
        const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
        
        const events = await loadTravelEventsForDateRange(userId, startDateStr, endDateStr);
        setTravelEvents(events);
      } catch (error: any) {
        console.error('[useCalendarTasks] Error loading travel events:', error);
        setTravelEvents([]); // On error, set empty array
      } finally {
        setTravelEventsLoading(false);
      }
    }

    loadTravelEvents();
  }, [userId, dateRange]);

  // Memoize dayGroups calculation
  // Only recalculate when: tasks, dateRange, includeCompleted, or userId change
  const dayGroups = useMemo((): DayTaskGroup[] => {
    // If no userId, return empty array
    if (!userId) {
      return [];
    }

    // If tasks are empty, return empty day groups for the date range
    if (tasks.length === 0) {
      // Still need to return day groups for the date range (even if empty)
      // This ensures the calendar view has the correct structure
      const { startDate, endDate } = dateRange;
      return groupTasksByDay([], startDate, endDate, travelEvents);
    }

    // Create query for filtering tasks
    const query: CalendarTaskQuery = {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      includeCompleted,
      userId,
    };

    // Filter tasks for the date range
    const calendarTasks = getTasksForDateRange(tasks, query);

    // Group tasks by day, including travel events (Problem 16)
    const grouped = groupTasksByDay(calendarTasks, dateRange.startDate, dateRange.endDate, travelEvents);

    return grouped;
  }, [tasks, dateRange.startDate, dateRange.endDate, includeCompleted, userId, travelEvents]);

  // Combine loading states
  const isLoading = tasksLoading || travelEventsLoading || !userId;

  // Use tasksError as error state
  const error = tasksError;

  // Refresh function: refresh tasks and sync with server
  const refresh = async (): Promise<void> => {
    try {
      await refreshTasks();
      await syncTasks();
    } catch (error: any) {
      console.error('[useCalendarTasks] Error refreshing:', error);
      // Error is already set in useSync hook
    }
  };

  return {
    dayGroups,
    isLoading,
    error,
    refresh,
  };
}

