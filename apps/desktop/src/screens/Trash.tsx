/**
 * Trash Screen
 * Problem 13: View and manage soft-deleted tasks
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, RotateCcw, X, AlertTriangle, RefreshCw } from "lucide-react";
import { loadTrashFromCache } from "../lib/dbTrash";
import { getCurrentUserId } from "../lib/supabaseClient";
import { useTaskStore } from "../stores/taskStore";
import { format, parseISO } from "date-fns";
import toast from "react-hot-toast";
import type { Task } from "@mydailyops/core";

export default function TrashScreen() {
  const navigate = useNavigate();
  const { restoreTask, hardDeleteTask, emptyTrash, fetchTasks } = useTaskStore();
  const [trashTasks, setTrashTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmptying, setIsEmptying] = useState(false);

  useEffect(() => {
    loadTrash();
  }, []);

  const loadTrash = async () => {
    try {
      setIsLoading(true);
      const userId = await getCurrentUserId();
      if (!userId) {
        navigate("/login");
        return;
      }

      const tasks = await loadTrashFromCache(userId);
      setTrashTasks(tasks);
    } catch (error: any) {
      console.error("[Trash] Error loading trash:", error);
      toast.error("Failed to load trash");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (taskId: string) => {
    try {
      await restoreTask(taskId);
      await loadTrash(); // Reload trash list
      await fetchTasks(); // Refresh main task list
      toast.success("Task restored successfully");
    } catch (error: any) {
      console.error("[Trash] Error restoring task:", error);
      toast.error(error.message || "Failed to restore task");
    }
  };

  const handleHardDelete = async (taskId: string) => {
    if (!confirm("Permanently delete this task? This cannot be undone.")) {
      return;
    }

    try {
      await hardDeleteTask(taskId);
      await loadTrash(); // Reload trash list
      toast.success("Task permanently deleted");
    } catch (error: any) {
      console.error("[Trash] Error hard deleting task:", error);
      toast.error(error.message || "Failed to delete task");
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirm(`Permanently delete all ${trashTasks.length} tasks in Trash? This cannot be undone.`)) {
      return;
    }

    try {
      setIsEmptying(true);
      const count = await emptyTrash();
      await loadTrash();
      toast.success(`Permanently deleted ${count} task${count !== 1 ? 's' : ''}`);
    } catch (error: any) {
      console.error("[Trash] Error emptying trash:", error);
      toast.error(error.message || "Failed to empty trash");
    } finally {
      setIsEmptying(false);
    }
  };

  const getDaysSinceDeletion = (deletedAt: string | null): number => {
    if (!deletedAt) return 0;
    const deleted = parseISO(deletedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - deleted.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDeletionWarning = (days: number): string | null => {
    if (days >= 30) return "Will be auto-purged soon";
    if (days >= 25) return "Auto-purge in a few days";
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Trash2 className="w-6 h-6 text-gray-900 dark:text-white" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Trash
          </h1>
          {trashTasks.length > 0 && (
            <span className="px-2 py-1 text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full">
              {trashTasks.length}
            </span>
          )}
        </div>

        {trashTasks.length > 0 && (
          <button
            onClick={handleEmptyTrash}
            disabled={isEmptying}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center gap-2"
          >
            {isEmptying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Emptying...
              </>
            ) : (
              <>
                <X className="w-4 h-4" />
                Empty Trash
              </>
            )}
          </button>
        )}
      </div>

      {trashTasks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Trash2 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Trash is empty
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Deleted tasks will appear here. They can be restored within 30 days.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {trashTasks.map((task) => {
            const deletedAt = (task as any).deleted_at;
            const daysSince = getDaysSinceDeletion(deletedAt);
            const warning = getDeletionWarning(daysSince);

            return (
              <div
                key={task.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-medium text-gray-900 dark:text-white">
                        {task.title}
                      </h3>
                      {task.category && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                          {task.category}
                        </span>
                      )}
                      {task.priority && (
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            task.priority === "high"
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                              : task.priority === "medium"
                              ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                              : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          }`}
                        >
                          {task.priority}
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      {deletedAt && (
                        <span>
                          Deleted {format(parseISO(deletedAt), "MMM d, yyyy 'at' h:mm a")}
                          {" "}({daysSince} day{daysSince !== 1 ? 's' : ''} ago)
                        </span>
                      )}
                      {warning && (
                        <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                          <AlertTriangle className="w-3 h-3" />
                          {warning}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleRestore(task.id)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="Restore task"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleHardDelete(task.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                      title="Permanently delete"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {trashTasks.length > 0 && (
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Auto-purge Notice
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                Tasks in Trash are automatically permanently deleted after 30 days. 
                Make sure to restore any tasks you want to keep before then.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

