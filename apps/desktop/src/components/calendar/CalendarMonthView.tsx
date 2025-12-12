/**
 * Calendar Month View Component
 * 
 * Month view showing full calendar grid (like traditional calendar).
 * Displays all days of the month in a 7-column grid.
 */

import { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import DatePicker from "react-datepicker";
import { useCalendarTasks } from "../../hooks/useCalendarTasks";
import CalendarDay from "./CalendarDay";
import type { TravelEvent } from "@mydailyops/core";

interface CalendarMonthViewProps {
  month: Date;                   // Any date in the month
  includeCompleted?: boolean;
  onDateChange?: (date: Date) => void;
  onTaskClick?: (task: any) => void;
  onTaskToggleComplete?: (task: any) => void;
  onTravelEventClick?: (event: TravelEvent) => void;
  onAddTask?: (date?: Date) => void;
}

export default function CalendarMonthView({
  month,
  includeCompleted = false,
  onDateChange,
  onTaskClick,
  onTaskToggleComplete,
  onTravelEventClick,
  onAddTask,
}: CalendarMonthViewProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(month);

  // Get calendar data for the month
  const { dayGroups, isLoading, error, refresh } = useCalendarTasks({
    view: 'month',
    centerDate: selectedMonth,
    includeCompleted,
  });

  // Calculate month start and end
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  // Get first day of calendar grid (start of week containing month start)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  // Get last day of calendar grid (end of week containing month end)
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  // Generate all days in calendar grid
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Create a map of dayGroups by dateKey for quick lookup
  const dayGroupsMap = new Map<string, typeof dayGroups[0]>();
  dayGroups.forEach(dayGroup => {
    dayGroupsMap.set(dayGroup.dateKey, dayGroup);
  });

  // Handle month navigation
  const handlePreviousMonth = () => {
    const newMonth = subMonths(selectedMonth, 1);
    setSelectedMonth(newMonth);
    onDateChange?.(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = addMonths(selectedMonth, 1);
    setSelectedMonth(newMonth);
    onDateChange?.(newMonth);
  };

  const handleThisMonth = () => {
    const today = new Date();
    setSelectedMonth(today);
    onDateChange?.(today);
  };

  const handleDatePickerChange = (newDate: Date | null) => {
    if (newDate) {
      setSelectedMonth(newDate);
      onDateChange?.(newDate);
      setShowDatePicker(false);
    }
  };

  // Check if a date is in the current month
  const isInCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === selectedMonth.getMonth() &&
           date.getFullYear() === selectedMonth.getFullYear();
  };

  // Week day headers
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
      {/* Header with Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {/* Previous Month Button */}
          <button
            onClick={handlePreviousMonth}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Previous month"
          >
            <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </button>

          {/* Month/Year Display and Picker */}
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {format(selectedMonth, "MMMM yyyy")}
              </h2>
            </button>

            {/* Date Picker for Month/Year Selection */}
            {showDatePicker && (
              <div className="absolute top-full left-0 mt-2 z-50">
                <DatePicker
                  selected={selectedMonth}
                  onChange={handleDatePickerChange}
                  dateFormat="MMM yyyy"
                  showMonthYearPicker
                  inline
                  calendarClassName="rounded-lg shadow-lg"
                />
              </div>
            )}
          </div>

          {/* Next Month Button */}
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Next month"
          >
            <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
          </button>

          {/* This Month Button */}
          <button
            onClick={handleThisMonth}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            This Month
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

      {/* Calendar Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading tasks...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1">
          {/* Week Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map((dayName) => (
              <div
                key={dayName}
                className="text-center text-sm font-semibold text-gray-700 dark:text-gray-300 py-2"
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-2 flex-1">
            {calendarDays.map((day) => {
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

              const isCurrentMonth = isInCurrentMonth(day);

              return (
                <CalendarDay
                  key={dateKey}
                  dayGroup={dayGroup}
                  compact={true}
                  maxTasksVisible={3} // Show max 3 tasks, then "+X more"
                  isOtherMonth={!isCurrentMonth}
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
        </div>
      )}
    </div>
  );
}

