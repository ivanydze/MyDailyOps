import { Task } from "@mydailyops/core";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { CheckCircle2, Circle, Clock, Tag } from "lucide-react";
import { isRecurringTemplate } from "../utils/recurring";
import { formatEventTime } from "../utils/timezone";

interface TaskCardProps {
  task: Task;
  onToggleStatus?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

const priorityColors = {
  high: "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800",
  medium: "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800",
  low: "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-300 dark:border-green-800",
};

export default function TaskCard({ task, onToggleStatus, onEdit, onDelete }: TaskCardProps) {
  const isCompleted = task.status === "done";
  const priorityClass = priorityColors[task.priority];
  const isTemplate = isRecurringTemplate(task);

  // Get timezone-safe event time (Problem 17)
  const eventTimeDisplay = formatEventTime(task);
  
  const getDeadlineDisplay = () => {
    // If event_time is set, prioritize it over deadline
    if (eventTimeDisplay) {
      return { text: eventTimeDisplay, class: "text-blue-600 dark:text-blue-400" };
    }

    if (!task.deadline) return null;

    const deadline = new Date(task.deadline);
    const timeStr = format(deadline, "HH:mm");
    
    if (isPast(deadline) && !isCompleted) {
      return { text: `Overdue, ${timeStr}`, class: "text-red-600 dark:text-red-400" };
    }
    if (isToday(deadline)) {
      return { text: `Today, ${timeStr}`, class: "text-blue-600 dark:text-blue-400" };
    }
    if (isTomorrow(deadline)) {
      return { text: `Tomorrow, ${timeStr}`, class: "text-orange-600 dark:text-orange-400" };
    }
    return {
      text: format(deadline, "MMM d, yyyy, HH:mm"),
      class: "text-gray-600 dark:text-gray-400",
    };
  };

  const deadlineDisplay = getDeadlineDisplay();

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow ${
        isCompleted ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Status Toggle */}
        {!isTemplate && (
          <button
            onClick={() => onToggleStatus?.(task)}
            className="mt-0.5 flex-shrink-0 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title={isCompleted ? "Mark as pending" : "Mark as done"}
          >
            {isCompleted ? (
              <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
            ) : (
              <Circle size={20} />
            )}
          </button>
        )}
        {isTemplate && (
          <div className="mt-0.5 flex-shrink-0 text-gray-400 dark:text-gray-500" title="Recurring template cannot be completed">
            <Circle size={20} className="opacity-50" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={`font-medium text-gray-900 dark:text-white ${
                isCompleted ? "line-through" : ""
              }`}
            >
              {task.title}
            </h3>
            {task.pinned && (
              <span className="text-yellow-500 dark:text-yellow-400 text-xs">📌</span>
            )}
          </div>

          {task.description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Metadata */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {/* Priority Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${priorityClass}`}
            >
              {task.priority}
            </span>

            {/* Category */}
            {task.category && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                <Tag size={12} />
                {task.category}
              </span>
            )}

            {/* Deadline */}
            {deadlineDisplay && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${deadlineDisplay.class}`}
              >
                <Clock size={12} />
                {deadlineDisplay.text}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1">
          {onEdit && (
            <button
              onClick={() => onEdit(task)}
              className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1"
              title="Edit task"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(task)}
              className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1"
              title="Delete task"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

