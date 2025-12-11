/**
 * Calendar Mini Month Component
 * 
 * Compact month calendar for Year View.
 * Shows a mini calendar grid with task indicators.
 */

import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isEqual, startOfDay } from "date-fns";
import type { DayTaskGroup } from "../../utils/calendar";

interface CalendarMiniMonthProps {
  month: Date;
  dayGroups: DayTaskGroup[];
  onMonthClick?: (date: Date) => void;
  onDateClick?: (date: Date) => void;
}

export default function CalendarMiniMonth({
  month,
  dayGroups,
  onMonthClick,
  onDateClick,
}: CalendarMiniMonthProps) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  
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
  
  // Check if a date is in the current month
  const isInCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === month.getMonth() &&
           date.getFullYear() === month.getFullYear();
  };
  
  // Week day headers (abbreviated)
  const weekDayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  const monthName = format(month, "MMMM yyyy");
  const today = startOfDay(new Date());
  
  return (
    <div
      className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 p-2 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onMonthClick?.(monthStart)}
    >
      {/* Month Header */}
      <div className="text-center font-semibold text-sm text-gray-900 dark:text-white mb-2 pb-1 border-b border-gray-200 dark:border-gray-700">
        {monthName}
      </div>
      
      {/* Week Day Headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {weekDayHeaders.map((day, index) => (
          <div
            key={index}
            className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-0.5"
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map((day) => {
          // Create dateKey for this day
          const year = day.getFullYear();
          const monthNum = String(day.getMonth() + 1).padStart(2, '0');
          const dayNum = String(day.getDate()).padStart(2, '0');
          const dateKey = `${year}-${monthNum}-${dayNum}`;
          
          // Get dayGroup for this day
          const dayGroup = dayGroupsMap.get(dateKey);
          const taskCount = dayGroup?.tasks.length || 0;
          const isCurrentMonth = isInCurrentMonth(day);
          const isTodayDate = isEqual(startOfDay(day), today);
          
          return (
            <button
              key={dateKey}
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering month click
                onDateClick?.(day);
              }}
              className={`
                aspect-square text-xs rounded transition-colors
                ${isCurrentMonth 
                  ? isTodayDate
                    ? "bg-blue-500 text-white font-bold"
                    : "text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                  : "text-gray-400 dark:text-gray-600"
                }
                ${taskCount > 0 ? "relative" : ""}
              `}
              title={taskCount > 0 ? `${taskCount} task${taskCount > 1 ? 's' : ''}` : ''}
            >
              <span>{format(day, "d")}</span>
              {/* Task Indicator */}
              {taskCount > 0 && (
                <span
                  className={`
                    absolute bottom-0.5 left-1/2 transform -translate-x-1/2
                    w-1 h-1 rounded-full
                    ${isTodayDate
                      ? "bg-white"
                      : taskCount > 3
                        ? "bg-red-500"
                        : taskCount > 1
                          ? "bg-orange-500"
                          : "bg-blue-500"
                    }
                  `}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

