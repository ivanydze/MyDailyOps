/**
 * Calendar Tasks Hook
 * 
 * React hook that provides calendar-ready task data for a date range
 * Implements Phase 2: React Hook for Calendar Data
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
import { useTaskStore } from '../stores/taskStore';
import { getCurrentUserId } from '../lib/supabaseClient';
import {
  getTasksForDateRange,
  groupTasksByDay,
  type DayTaskGroup,
  type CalendarTaskQuery,
} from '../utils/calendar';
import { loadTravelEventsForDateRange } from '../lib/dbTravelEvents';
import type { TravelEvent } from '@mydailyops/core';

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
 * React hook for calendar task data
 * 
 * Provides tasks grouped by day for a given calendar view and date range.
 * Automatically filters tasks, excludes recurring templates, and groups by day.
 * 
 * @param options Calendar view options
 * @returns Calendar task data with loading/error states
 */
export function useCalendarTasks(
  options: UseCalendarTasksOptions
): UseCalendarTasksReturn {
  const { view, centerDate, includeCompleted = false } = options;

  // Get tasks and state from task store
  const { tasks, isLoading: tasksLoading, error: tasksError, fetchTasks } = useTaskStore();

  // Get userId from tasks (if available) or fetch it asynchronously
  // Tasks are already filtered by userId in taskStore, so we can extract it from the first task
  const [userId, setUserId] = useState<string | null>(null);
  const [userIdError, setUserIdError] = useState<string | null>(null);
  
  // Travel events state (Problem 16)
  const [travelEvents, setTravelEvents] = useState<TravelEvent[]>([]);
  const [travelEventsLoading, setTravelEventsLoading] = useState(false);

  // Get userId: prefer from tasks, fallback to async fetch
  useEffect(() => {
    // Try to get userId from tasks first (faster, no async call needed)
    if (tasks.length > 0 && (tasks[0] as any).user_id) {
      const idFromTasks = (tasks[0] as any).user_id;
      if (idFromTasks !== userId) {
        setUserId(idFromTasks);
        setUserIdError(null);
      }
      return; // Found userId from tasks, no need to fetch
    }

    // If no tasks or no user_id in tasks, fetch userId asynchronously
    async function loadUserId() {
      try {
        const id = await getCurrentUserId();
        setUserId(id);
        setUserIdError(null);
      } catch (error: any) {
        console.error('[useCalendarTasks] Error getting userId:', error);
        setUserIdError(error.message || 'Failed to get user ID');
        setUserId(null);
      }
    }

    loadUserId();
  }, [tasks, userId]); // Re-check when tasks change (in case of auth state change)

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
        
        const events = await loadTravelEventsForDateRange(userId!, startDateStr, endDateStr);
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
  const isLoading = tasksLoading || travelEventsLoading || userId === null;

  // Combine error states (prefer tasksError over userIdError)
  const error = tasksError || userIdError;

  // Refresh function: fetch tasks and re-check userId
  const refresh = async (): Promise<void> => {
    try {
      await fetchTasks();
      // userId will be updated via useEffect when tasks change
    } catch (error: any) {
      console.error('[useCalendarTasks] Error refreshing:', error);
      // Error is already set in taskStore
    }
  };

  return {
    dayGroups,
    isLoading,
    error,
    refresh,
  };
}

