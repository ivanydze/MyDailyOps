import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTaskStore } from "../stores/taskStore";
import TaskCard from "../components/TaskCard";
import { isPast, parseISO } from "date-fns";
import { Plus } from "lucide-react";
import { isVisibleToday } from "../utils/visibility";
import { shouldShowTaskOnWeekend } from "../utils/weekend";
import { useSettingsStore } from "../stores/settingsStore";

export default function Today() {
  const navigate = useNavigate();
  const { tasks, isLoading, error, fetchTasks, updateTask, deleteTask } = useTaskStore();
  const weekendFilter = useSettingsStore((state) => state.weekendFilter);

  useEffect(() => {
    // Fetch tasks on mount
    console.log('[Today] Component mounted, fetching tasks...');
    console.log('[Today] Current tasks count:', tasks.length);
    fetchTasks().then(() => {
      console.log('[Today] Tasks fetched, new tasks count:', tasks.length);
    }).catch((err) => {
      console.error('[Today] Error fetching tasks:', err);
    });
  }, []); // Empty deps - only run once on mount

  // Debug: log when tasks change
  useEffect(() => {
    console.log('[Today] Tasks updated:', tasks.length);
  }, [tasks]);

  // Filter tasks for today using visibility engine (Problem 5)
  // Uses visible_from and visible_until fields for proper duration-based filtering
  // Also applies weekend filtering (Problem 8)
  const todayTasks = tasks.filter((task) => {
    // Hide completed tasks
    if (task.status === "done") return false;

    // Use visibility fields if available (new logic)
    const visibleFrom = (task as any).visible_from;
    const visibleUntil = (task as any).visible_until;
    
    let isVisible = false;
    if (visibleFrom || visibleUntil) {
      // Task has visibility range - check if today is within range
      isVisible = isVisibleToday(visibleFrom, visibleUntil);
    } else {
      // Fallback: legacy behavior for tasks without visibility fields
      // Only show tasks with deadline that are today or overdue
      if (!task.deadline) return false;
      const deadline = parseISO(task.deadline);
      isVisible = isPast(deadline) || deadline.toDateString() === new Date().toDateString();
    }

    // If not visible today, exclude
    if (!isVisible) return false;

    // Problem 8: Apply weekend filtering
    // Calendar & Upcoming ignore this filter, but Today view applies it
    return shouldShowTaskOnWeekend(task, weekendFilter);
  });

  // Sort: overdue first, then by priority (high > medium > low), then by deadline
  const sortedTasks = [...todayTasks].sort((a, b) => {
    // Overdue tasks first
    const aOverdue = a.deadline && isPast(parseISO(a.deadline));
    const bOverdue = b.deadline && isPast(parseISO(b.deadline));
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    // Then by priority
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

  const handleToggleStatus = async (task: any) => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading tasks...</p>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Today</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {sortedTasks.length} {sortedTasks.length === 1 ? "task" : "tasks"} due today
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

      {sortedTasks.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No tasks due today! 🎉
          </p>
          <button
            onClick={() => navigate("/tasks/new")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Create your first task
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleStatus={handleToggleStatus}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
