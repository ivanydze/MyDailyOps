/**
 * Calendar Year View Component
 * 
 * Year view showing 12 months in a grid.
 * Each month displays as a mini calendar with task indicators.
 */

import { useState } from "react";
import { format, addYears, subYears, startOfYear, getYear } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useCalendarTasks } from "../../hooks/useCalendarTasks";
import CalendarMiniMonth from "./CalendarMiniMonth";

interface CalendarYearViewProps {
  year: number;
  includeCompleted?: boolean;
  onMonthClick?: (month: Date) => void;
  onDateChange?: (date: Date) => void;
  onTaskClick?: (task: any) => void;
  onAddTask?: (date?: Date) => void;
}

export default function CalendarYearView({
  year,
  includeCompleted = false,
  onMonthClick,
  onDateChange,
  onTaskClick,
  onAddTask,
}: CalendarYearViewProps) {
  const [selectedYear, setSelectedYear] = useState(year);

  // Get calendar data for the entire year
  const yearStart = startOfYear(new Date(selectedYear, 0, 1));
  const { dayGroups, isLoading, error, refresh } = useCalendarTasks({
    view: 'year',
    centerDate: yearStart,
    includeCompleted,
  });

  // Group dayGroups by month
  const monthGroups = new Map<number, typeof dayGroups>();
  dayGroups.forEach(dayGroup => {
    const month = dayGroup.date.getMonth();
    if (!monthGroups.has(month)) {
      monthGroups.set(month, []);
    }
    monthGroups.get(month)!.push(dayGroup);
  });

  // Generate 12 months for the year
  const months: Date[] = [];
  for (let i = 0; i < 12; i++) {
    months.push(new Date(selectedYear, i, 1));
  }

  // Handle year navigation
  const handlePreviousYear = () => {
    const newYear = selectedYear - 1;
    setSelectedYear(newYear);
  };

  const handleNextYear = () => {
    const newYear = selectedYear + 1;
    setSelectedYear(newYear);
  };

  const handleThisYear = () => {
    const currentYear = getYear(new Date());
    setSelectedYear(currentYear);
  };

  // Handle month click - navigate to month view
  const handleMonthClick = (monthStart: Date) => {
    if (onMonthClick) {
      onMonthClick(monthStart);
    } else if (onDateChange) {
      onDateChange(monthStart);
    }
  };

  // Handle date click - navigate to day view
  const handleDateClick = (date: Date) => {
    if (onDateChange) {
      onDateChange(date);
    }
  };

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
      {/* Header with Year Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {/* Previous Year Button */}
          <button
            onClick={handlePreviousYear}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Previous year"
          >
            <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </button>

          {/* Year Display */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {selectedYear}
            </h2>
          </div>

          {/* Next Year Button */}
          <button
            onClick={handleNextYear}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Next year"
          >
            <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
          </button>

          {/* This Year Button */}
          <button
            onClick={handleThisYear}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            This Year
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

      {/* Year Grid - 12 Months */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading tasks...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 flex-1">
          {months.map((month) => {
            const monthDayGroups = monthGroups.get(month.getMonth()) || [];
            
            return (
              <CalendarMiniMonth
                key={`${month.getFullYear()}-${month.getMonth()}`}
                month={month}
                dayGroups={monthDayGroups}
                onMonthClick={handleMonthClick}
                onDateClick={handleDateClick}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

