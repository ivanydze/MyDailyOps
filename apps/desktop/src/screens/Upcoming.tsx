import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTaskStore } from "../stores/taskStore";
import TaskCard from "../components/TaskCard";
import { parseISO } from "date-fns";
import { Plus, Calendar } from "lucide-react";
import { isUpcoming } from "../utils/visibility";
import { isRecurringTemplate } from "../utils/recurring";
import toast from "react-hot-toast";

/**
 * Upcoming Screen - Shows tasks that will become visible in the next 7 days
 * Implements Problem 4: Future Tasks Must Be Visible in Advance
 * 
 * Uses isUpcoming() function from visibility engine to filter tasks where:
 * visible_from > today && visible_from <= today + 7 days
 */
export default function Upcoming() {
  const navigate = useNavigate();
  const { tasks, isLoading, error, fetchTasks, updateTask, deleteTask } = useTaskStore();

  useEffect(() => {
    // Fetch tasks on mount
    console.log('[Upcoming] Component mounted, fetching tasks...');
    fetchTasks().catch((err) => {
      console.error('[Upcoming] Error fetching tasks:', err);
    });
  }, []); // Empty deps - only run once on mount

  // Filter tasks for upcoming (next 7 days) using visibility engine (Problem 4)
  // Uses isUpcoming() which checks: visible_from > today && visible_from <= today + 7
  // NOTE: Problem 8 - Upcoming view ignores weekend filter (shows all tasks)
  const upcomingTasks = tasks.filter((task) => {
    // Hide completed tasks
    if (task.status === "done") return false;

    // Use visibility fields to check if task is upcoming
    const visibleFrom = (task as any).visible_from;
    
    if (visibleFrom) {
      // Task has visible_from - use isUpcoming() function
      return isUpcoming(visibleFrom, new Date(), 7);
    }

    // Legacy: tasks without visible_from are not considered upcoming
    // (They would be shown in Today view if they have deadline today/overdue)
    return false;
  });

  // Group tasks by day (when they become visible)
  const tasksByDay = upcomingTasks.reduce((acc, task) => {
    const visibleFrom = (task as any).visible_from;
    if (!visibleFrom) return acc;

    try {
      const date = parseISO(visibleFrom).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(task);
      return acc;
    } catch {
      return acc;
    }
  }, {} as Record<string, typeof upcomingTasks>);

  // Sort days chronologically
  const sortedDays = Object.keys(tasksByDay).sort((a, b) => {
    return parseISO((tasksByDay[a][0] as any).visible_from).getTime() - 
           parseISO((tasksByDay[b][0] as any).visible_from).getTime();
  });

  // Sort tasks within each day: by priority (high > medium > low), then by deadline
  sortedDays.forEach((day) => {
    tasksByDay[day].sort((a, b) => {
      // By priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by deadline
      if (a.deadline && b.deadline) {
        return parseISO(a.deadline).getTime() - parseISO(b.deadline).getTime();
      }
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    });
  });

  const handleToggleStatus = async (task: any) => {
    // Prevent completing recurring templates (Problem 9)
    if (isRecurringTemplate(task)) {
      toast.error("Recurring templates cannot be completed. Complete the occurrence instead.");
      return;
    }

    const newStatus = task.status === "done" ? "pending" : "done";
    await updateTask(task.id, { status: newStatus });
    await fetchTasks(); // Refresh to get updated list
  };

  const handleEdit = (task: any) => {
    navigate(`/tasks/${task.id}/edit`);
  };

  const handleDelete = async (task: any) => {
    if (window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
      await deleteTask(task.id);
      await fetchTasks();
    }
  };

  // Format day label (Today, Tomorrow, or date)
  const formatDayLabel = (dateString: string) => {
    const date = parseISO((tasksByDay[dateString][0] as any).visible_from);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    if (targetDate.getTime() === today.getTime()) {
      return "Today";
    }
    if (targetDate.getTime() === tomorrow.getTime()) {
      return "Tomorrow";
    }
    
    // Format as weekday + date (e.g., "Monday, Jan 15")
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading upcoming tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">Error loading tasks: {error}</p>
        <button
          onClick={() => fetchTasks()}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Upcoming
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {upcomingTasks.length} {upcomingTasks.length === 1 ? "task" : "tasks"} in the next 7 days
          </p>
        </div>
        <button
          onClick={() => navigate("/tasks/new")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          New Task
        </button>
      </div>

      {upcomingTasks.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2 text-lg font-medium">
            No upcoming tasks
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mb-4">
            Tasks with deadlines in the next 7 days will appear here
          </p>
          <button
            onClick={() => navigate("/tasks/new")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Create a task
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDays.map((day) => (
            <div key={day} className="space-y-3">
              <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 py-2 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  {formatDayLabel(day)}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {tasksByDay[day].length} {tasksByDay[day].length === 1 ? "task" : "tasks"}
                </p>
              </div>
              <div className="space-y-4">
                {tasksByDay[day].map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleStatus={handleToggleStatus}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

