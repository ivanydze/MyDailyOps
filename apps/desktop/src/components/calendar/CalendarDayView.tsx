/**
 * Calendar Day View Component
 * 
 * Full day view showing single day with all tasks.
 * Used within calendar screens for displaying a single day in detail.
 */

import { useState } from "react";
import { format, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import DatePicker from "react-datepicker";
import { useCalendarTasks } from "../../hooks/useCalendarTasks";
import TaskCalendarItem from "./TaskCalendarItem";

interface CalendarDayViewProps {
  date: Date;
  includeCompleted?: boolean;
  onDateChange?: (date: Date) => void;
  onTaskClick?: (task: any) => void;
  onTaskToggleComplete?: (task: any) => void;
  onAddTask?: (date?: Date) => void;
}

export default function CalendarDayView({
  date,
  includeCompleted = false,
  onDateChange,
  onTaskClick,
  onTaskToggleComplete,
  onAddTask,
}: CalendarDayViewProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(date);

  // Get calendar data for the selected date
  const { dayGroups, isLoading, error, refresh } = useCalendarTasks({
    view: 'day',
    centerDate: selectedDate,
    includeCompleted,
  });

  // Get the day group for the selected date
  const dayGroup = dayGroups.length > 0 ? dayGroups[0] : null;

  // Handle date navigation
  const handlePreviousDay = () => {
    const newDate = subDays(selectedDate, 1);
    setSelectedDate(newDate);
    onDateChange?.(newDate);
  };

  const handleNextDay = () => {
    const newDate = addDays(selectedDate, 1);
    setSelectedDate(newDate);
    onDateChange?.(newDate);
  };

  const handleToday = () => {
    const today = new Date();
    setSelectedDate(today);
    onDateChange?.(today);
  };

  const handleDatePickerChange = (newDate: Date | null) => {
    if (newDate) {
      setSelectedDate(newDate);
      onDateChange?.(newDate);
      setShowDatePicker(false);
    }
  };

  // Format date for display
  const formattedDate = format(selectedDate, "EEEE, MMMM d, yyyy");
  const isToday = format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

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
      {/* Header with Date Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {/* Previous Day Button */}
          <button
            onClick={handlePreviousDay}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Previous day"
          >
            <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </button>

          {/* Date Display and Picker */}
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {formattedDate}
              </h2>
              {isToday && (
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                  Today
                </span>
              )}
            </button>

            {/* Date Picker */}
            {showDatePicker && (
              <div className="absolute top-full left-0 mt-2 z-50">
                <DatePicker
                  selected={selectedDate}
                  onChange={handleDatePickerChange}
                  inline
                  calendarClassName="rounded-lg shadow-lg"
                />
              </div>
            )}
          </div>

          {/* Next Day Button */}
          <button
            onClick={handleNextDay}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Next day"
          >
            <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
          </button>

          {/* Today Button */}
          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Today
          </button>
        </div>

        {/* Add Task Button */}
        {onAddTask && (
          <button
            onClick={() => onAddTask(selectedDate)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Add Task
          </button>
        )}
      </div>

      {/* Day Content */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading tasks...</p>
          </div>
        </div>
      ) : dayGroup ? (
        <div className="flex-1">
          {/* Show tasks list in a more detailed view for day view */}
          {dayGroup.tasks.length === 0 ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No tasks for this day
                </p>
                {onAddTask && (
                  <button
                    onClick={() => onAddTask(selectedDate)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={20} />
                    Create your first task
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {dayGroup.tasks.length} {dayGroup.tasks.length === 1 ? "task" : "tasks"}
                </h3>
              </div>
              {/* Render tasks using TaskCalendarItem for better day view layout */}
              {dayGroup.tasks.map((calendarTask) => (
                <TaskCalendarItem
                  key={calendarTask.task.id}
                  task={calendarTask}
                  date={dayGroup.date}
                  onClick={onTaskClick}
                  onToggleComplete={onTaskToggleComplete}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No tasks for this day
            </p>
            {onAddTask && (
              <button
                onClick={() => onAddTask(selectedDate)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} />
                Create your first task
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

