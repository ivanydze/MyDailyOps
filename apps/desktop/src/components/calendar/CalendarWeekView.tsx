/**
 * Calendar Week View Component
 * 
 * Week view showing 7 days in a grid layout.
 * Each day displays its tasks using CalendarDay component.
 */

import { useState } from "react";
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useCalendarTasks } from "../../hooks/useCalendarTasks";
import CalendarDay from "./CalendarDay";
import type { TravelEvent } from "@mydailyops/core";

interface CalendarWeekViewProps {
  weekStartDate: Date;           // First day of week (Sunday)
  includeCompleted?: boolean;
  onDateChange?: (date: Date) => void;
  onTaskClick?: (task: any) => void;
  onTaskToggleComplete?: (task: any) => void;
  onTravelEventClick?: (event: TravelEvent) => void;
  onAddTask?: (date?: Date) => void;
}

export default function CalendarWeekView({
  weekStartDate,
  includeCompleted = false,
  onDateChange,
  onTaskClick,
  onTaskToggleComplete,
  onTravelEventClick,
  onAddTask,
}: CalendarWeekViewProps) {
  const [selectedWeekStart, setSelectedWeekStart] = useState(weekStartDate);

  // Get calendar data for the week
  const { dayGroups, isLoading, error, refresh } = useCalendarTasks({
    view: 'week',
    centerDate: selectedWeekStart,
    includeCompleted,
  });

  // Calculate week range for display
  const weekStart = startOfWeek(selectedWeekStart, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 0 });
  const weekRange = `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;

  // Handle week navigation
  const handlePreviousWeek = () => {
    const newWeekStart = subWeeks(selectedWeekStart, 1);
    setSelectedWeekStart(newWeekStart);
    onDateChange?.(newWeekStart);
  };

  const handleNextWeek = () => {
    const newWeekStart = addWeeks(selectedWeekStart, 1);
    setSelectedWeekStart(newWeekStart);
    onDateChange?.(newWeekStart);
  };

  const handleThisWeek = () => {
    const today = new Date();
    const thisWeekStart = startOfWeek(today, { weekStartsOn: 0 });
    setSelectedWeekStart(thisWeekStart);
    onDateChange?.(thisWeekStart);
  };

  // Create a map of dayGroups by dateKey for quick lookup
  const dayGroupsMap = new Map<string, typeof dayGroups[0]>();
  dayGroups.forEach(dayGroup => {
    dayGroupsMap.set(dayGroup.dateKey, dayGroup);
  });

  // Generate all 7 days of the week
  const weekDays: Date[] = [];
  const weekStartCopy = new Date(weekStart); // Copy to avoid mutating
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStartCopy);
    day.setDate(weekStartCopy.getDate() + i);
    weekDays.push(day);
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">Error loading calendar: {error}</p>
        <button
          onClick={() => refresh()}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with Week Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {/* Previous Week Button */}
          <button
            onClick={handlePreviousWeek}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Previous week"
          >
            <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </button>

          {/* Week Range Display */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {weekRange}
            </h2>
          </div>

          {/* Next Week Button */}
          <button
            onClick={handleNextWeek}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Next week"
          >
            <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
          </button>

          {/* This Week Button */}
          <button
            onClick={handleThisWeek}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            This Week
          </button>
        </div>

        {/* Add Task Button */}
        {onAddTask && (
          <button
            onClick={() => onAddTask(new Date())}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Add Task
          </button>
        )}
      </div>

      {/* Week Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading tasks...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            // Create dateKey for this day
            const year = day.getFullYear();
            const month = String(day.getMonth() + 1).padStart(2, '0');
            const dayNum = String(day.getDate()).padStart(2, '0');
            const dateKey = `${year}-${month}-${dayNum}`;

            // Get dayGroup for this day, or create empty one
            const dayGroup = dayGroupsMap.get(dateKey) || {
              date: new Date(day),
              dateKey,
              tasks: [],
              travelEvents: [],
            };

            return (
              <CalendarDay
                key={dateKey}
                dayGroup={dayGroup}
                onDateClick={(date) => {
                  // Navigate to day view when clicking on a date
                  onDateChange?.(date);
                }}
                onTaskClick={onTaskClick}
                onTaskToggleComplete={onTaskToggleComplete}
                onTravelEventClick={onTravelEventClick}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

