/**
 * Calendar Day Component
 * 
 * Component for rendering a single day in calendar views.
 * Displays the date and all tasks visible on that day.
 */

import { format, isToday, isEqual, startOfDay } from "date-fns";
import type { DayTaskGroup } from "../../utils/calendar";
import TaskCalendarItem from "./TaskCalendarItem";

interface CalendarDayProps {
  dayGroup: DayTaskGroup;
  isToday?: boolean;
  isSelected?: boolean;
  onDateClick?: (date: Date) => void;
  onTaskClick?: (task: any) => void;
  onTaskToggleComplete?: (task: any) => void;
  TaskItemComponent?: React.ComponentType<{
    task: any;
    date: Date;
    context?: any;
    onClick?: (task: any) => void;
    onToggleComplete?: (task: any) => void;
  }>;
  maxTasksVisible?: number; // Maximum number of tasks to show before showing "+X more" (for month view)
  compact?: boolean; // Compact mode for month view
  isOtherMonth?: boolean; // True if day is from previous/next month (for month view)
}

export default function CalendarDay({
  dayGroup,
  isToday: isTodayProp,
  isSelected = false,
  onDateClick,
  onTaskClick,
  onTaskToggleComplete,
  TaskItemComponent = TaskCalendarItem,
  maxTasksVisible,
  compact = false,
  isOtherMonth = false,
}: CalendarDayProps) {
  const { date, tasks } = dayGroup;
  const dateDay = startOfDay(date);
  const today = startOfDay(new Date());
  
  // Determine if this is today
  const isTodayDate = isTodayProp !== undefined ? isTodayProp : isEqual(dateDay, today);

  // Format date display
  const dayNumber = format(date, "d");
  const dayName = format(date, "EEE"); // Mon, Tue, etc.

  // Handle task overflow for month view
  const visibleTasks = maxTasksVisible && tasks.length > maxTasksVisible
    ? tasks.slice(0, maxTasksVisible)
    : tasks;
  const hiddenTasksCount = maxTasksVisible && tasks.length > maxTasksVisible
    ? tasks.length - maxTasksVisible
    : 0;

  return (
    <div
      className={`flex flex-col h-full ${compact ? 'min-h-[80px]' : 'min-h-[120px]'} border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${
        isSelected ? "ring-2 ring-blue-500 dark:ring-blue-400" : ""
      } ${isTodayDate ? "bg-blue-50 dark:bg-blue-900/20" : ""} ${isOtherMonth ? "opacity-40" : ""}`}
    >
      {/* Day Header */}
      <div
        className={`${compact ? 'p-1' : 'p-2'} border-b border-gray-200 dark:border-gray-700 ${
          isTodayDate
            ? "bg-blue-100 dark:bg-blue-900/30 font-semibold"
            : "bg-gray-50 dark:bg-gray-900/50"
        }`}
      >
        <button
          onClick={() => onDateClick?.(date)}
          className="w-full text-left"
          type="button"
        >
          <div className="flex items-center justify-between">
            {!compact && (
              <span
                className={`text-xs font-medium ${
                  isTodayDate
                    ? "text-blue-700 dark:text-blue-300"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {dayName}
              </span>
            )}
            <span
              className={`${compact ? 'text-sm' : 'text-lg'} font-semibold ${
                isTodayDate
                  ? "text-blue-700 dark:text-blue-300"
                  : "text-gray-900 dark:text-white"
              }`}
            >
              {dayNumber}
            </span>
          </div>
        </button>
      </div>

      {/* Tasks List */}
      <div className={`flex-1 ${compact ? 'p-1' : 'p-2'} space-y-1 overflow-y-auto`}>
        {tasks.length === 0 ? (
          <div className="text-xs text-gray-400 dark:text-gray-600 text-center py-1">
            {compact ? '' : 'No tasks'}
          </div>
        ) : (
          <>
            {visibleTasks.map((calendarTask) => (
              <TaskItemComponent
                key={calendarTask.task.id}
                task={calendarTask}
                date={date}
                onClick={onTaskClick}
                onToggleComplete={onTaskToggleComplete}
              />
            ))}
            {hiddenTasksCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDateClick?.(date); // Navigate to day view to see all tasks
                }}
                className="w-full text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium py-1 text-left"
              >
                +{hiddenTasksCount} more
              </button>
            )}
          </>
        )}
      </div>

    </div>
  );
}

