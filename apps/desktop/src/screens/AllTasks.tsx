import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTaskStore } from "../stores/taskStore";
import TaskCard from "../components/TaskCard";
import { format, parseISO, isPast, isToday, isTomorrow, startOfWeek, endOfWeek, addDays } from "date-fns";
import { Plus, Search, Filter } from "lucide-react";
import type { TaskFilter } from "@mydailyops/core";

export default function AllTasks() {
  const navigate = useNavigate();
  const { tasks, isLoading, error, fetchTasks, updateTask, deleteTask } = useTaskStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [currentFilter, setCurrentFilter] = useState<TaskFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // Fetch tasks on mount
    fetchTasks();
  }, [fetchTasks]);

  // Filter and search tasks
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Apply status filter (exclude completed by default unless filter is "done")
    if (currentFilter !== "all" && currentFilter !== "done") {
      result = result.filter((task) => task.status !== "done");
    }

    // Apply date filter
    if (currentFilter !== "all" && currentFilter !== "done") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = addDays(today, 1);
      const weekEnd = addDays(today, 7);

      result = result.filter((task) => {
        if (!task.deadline) {
          return currentFilter === "overdue" ? false : true;
        }

        const deadline = parseISO(task.deadline);

        switch (currentFilter) {
          case "today":
            return isToday(deadline);
          case "tomorrow":
            return isTomorrow(deadline);
          case "this_week":
            return deadline <= weekEnd;
          case "overdue":
            return isPast(deadline) && task.status !== "done";
          default:
            return true;
        }
      });
    }

    if (currentFilter === "done") {
      result = result.filter((task) => task.status === "done");
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          task.category.toLowerCase().includes(query)
      );
    }

    return result;
  }, [tasks, currentFilter, searchQuery]);

  // Sort tasks
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      // Pinned tasks first
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

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

      // Finally by creation date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filteredTasks]);

  const handleToggleStatus = async (task: any) => {
    const newStatus = task.status === "done" ? "pending" : "done";
    await updateTask(task.id, { status: newStatus });
    await fetchTasks();
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

  const filterOptions: { value: TaskFilter; label: string }[] = [
    { value: "all", label: "All Tasks" },
    { value: "today", label: "Today" },
    { value: "tomorrow", label: "Tomorrow" },
    { value: "this_week", label: "This Week" },
    { value: "overdue", label: "Overdue" },
    { value: "done", label: "Completed" },
  ];

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Tasks</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {sortedTasks.length} {sortedTasks.length === 1 ? "task" : "tasks"}
            {currentFilter !== "all" && ` (${filterOptions.find((f) => f.value === currentFilter)?.label})`}
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

      {/* Search and Filters */}
      <div className="mb-6 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
              showFilters
                ? "bg-blue-100 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300"
                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            <Filter size={16} />
            Filter
          </button>

          {showFilters && (
            <div className="flex flex-wrap gap-2 w-full">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setCurrentFilter(option.value);
                    setShowFilters(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                    currentFilter === option.value
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {currentFilter !== "all" && (
            <button
              onClick={() => setCurrentFilter("all")}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* Tasks List */}
      {sortedTasks.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchQuery
              ? "No tasks match your search"
              : currentFilter === "all"
              ? "No tasks yet. Create your first task!"
              : `No tasks match the "${filterOptions.find((f) => f.value === currentFilter)?.label}" filter`}
          </p>
          {!searchQuery && currentFilter === "all" && (
            <button
              onClick={() => navigate("/tasks/new")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Create your first task
            </button>
          )}
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
