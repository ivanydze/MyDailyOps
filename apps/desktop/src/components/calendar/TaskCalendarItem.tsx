/**
 * Task Calendar Item Component
 * 
 * Reusable component for rendering a single task in calendar views.
 * More compact than TaskCard, optimized for calendar grid layouts.
 */

import { CheckCircle2, Circle, Tag } from "lucide-react";
import type { CalendarTask, TaskDayContext } from "../../utils/calendar";
import { getDayContextForTask } from "../../utils/calendar";

interface TaskCalendarItemProps {
  task: CalendarTask;
  date: Date;                    // The day this task appears on
  context?: TaskDayContext;      // Optional: "Day 3 of 5" context (will be calculated if not provided)
  onClick?: (task: any) => void;
  onToggleComplete?: (task: any) => void;
}

const priorityColors = {
  high: "border-l-red-500 bg-red-50 dark:bg-red-900/10",
  medium: "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10",
  low: "border-l-green-500 bg-green-50 dark:bg-green-900/10",
};

export default function TaskCalendarItem({
  task,
  date,
  context,
  onClick,
  onToggleComplete,
}: TaskCalendarItemProps) {
  const taskObj = task.task;
  const isCompleted = taskObj.status === "done" || (taskObj as any).is_completed === true;
  const priorityClass = priorityColors[taskObj.priority];

  // Get day context if not provided
  const dayContext = context || getDayContextForTask(task, date);

  // Show day context label for multi-day tasks
  const contextLabel = dayContext && dayContext.totalDays > 1
    ? `Day ${dayContext.dayIndex}/${dayContext.totalDays}`
    : null;

  return (
    <div
      className={`border-l-4 rounded-r-md p-2 text-sm cursor-pointer hover:shadow-md transition-all ${
        priorityClass
      } ${isCompleted ? "opacity-60" : ""}`}
      onClick={() => onClick?.(taskObj)}
    >
      <div className="flex items-start gap-2">
        {/* Status Toggle */}
        {onToggleComplete && (
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering onClick on parent
              onToggleComplete(taskObj);
            }}
            className="flex-shrink-0 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mt-0.5"
          >
            {isCompleted ? (
              <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
            ) : (
              <Circle size={16} />
            )}
          </button>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="flex items-start justify-between gap-2">
            <h4
              className={`font-medium text-gray-900 dark:text-white text-sm truncate ${
                isCompleted ? "line-through" : ""
              }`}
              title={taskObj.title}
            >
              {taskObj.title}
            </h4>
            {(taskObj as any).pinned && (
              <span className="text-yellow-500 dark:text-yellow-400 text-xs flex-shrink-0">📌</span>
            )}
          </div>

          {/* Day Context Label (for multi-day tasks) */}
          {contextLabel && (
            <div className="mt-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {contextLabel}
              </span>
            </div>
          )}

          {/* Metadata Row */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {/* Category */}
            {(taskObj as any).category && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                <Tag size={10} />
                <span className="truncate max-w-[80px]">{(taskObj as any).category}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

