/**
 * Weekly Checklist Screen
 * Problem 10: Always-Show Tasks → Weekly Checklists
 */

import { useEffect, useState } from "react";
import { Plus, Calendar, History } from "lucide-react";
import { useWeeklyChecklistStore } from "../stores/weeklyChecklistStore";
import ChecklistItem from "../components/weeklyChecklist/ChecklistItem";
import { format, parseISO } from "date-fns";
import { getChecklistStats } from "../utils/weeklyChecklist";
import toast from "react-hot-toast";

export default function WeeklyChecklistScreen() {
  const {
    currentChecklist,
    history,
    isLoading,
    error,
    loadCurrentWeekChecklist,
    loadHistory,
    addItem,
    updateItem,
    deleteItem,
    toggleItem,
    updateTitle,
    refresh,
  } = useWeeklyChecklistStore();

  const [newItemText, setNewItemText] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState("");

  useEffect(() => {
    loadCurrentWeekChecklist();
    loadHistory();
  }, [loadCurrentWeekChecklist, loadHistory]);

  useEffect(() => {
    if (currentChecklist) {
      setTitleText(currentChecklist.title || "");
    }
  }, [currentChecklist]);

  const handleAddItem = async () => {
    if (!newItemText.trim()) return;

    try {
      await addItem(newItemText.trim());
      setNewItemText("");
      toast.success("Item added");
    } catch (error: any) {
      toast.error(error.message || "Failed to add item");
    }
  };

  const handleUpdateItem = async (itemId: string, text: string) => {
    try {
      await updateItem(itemId, { text });
      toast.success("Item updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update item");
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteItem(itemId);
      toast.success("Item deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete item");
    }
  };

  const handleToggleItem = async (itemId: string) => {
    try {
      await toggleItem(itemId);
    } catch (error: any) {
      toast.error(error.message || "Failed to toggle item");
    }
  };

  const handleSaveTitle = async () => {
    try {
      await updateTitle(titleText);
      setEditingTitle(false);
      toast.success("Title updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update title");
    }
  };

  const getWeekRangeLabel = () => {
    if (!currentChecklist) return "";
    
    try {
      const start = parseISO(currentChecklist.week_start_date);
      const end = parseISO(currentChecklist.week_end_date);
      return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
    } catch {
      return currentChecklist.week_start_date;
    }
  };

  const stats = currentChecklist ? getChecklistStats(currentChecklist) : {
    total_items: 0,
    completed_items: 0,
    completion_percentage: 0,
  };

  if (isLoading && !currentChecklist) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading checklist...</p>
        </div>
      </div>
    );
  }

  if (error && !currentChecklist) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">Error: {error}</p>
        <button
          onClick={refresh}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!currentChecklist) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-12 text-center">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          No checklist available
        </p>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-6 h-6 text-gray-900 dark:text-white" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Weekly Checklist
            </h1>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {getWeekRangeLabel()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <History size={18} />
            {showHistory ? "Current Week" : "History"}
          </button>
        </div>
      </div>

      {showHistory ? (
        /* History View */
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Past Weeks
          </h2>
          {history.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-12 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                No past checklists yet
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((checklist) => {
                const weekStats = getChecklistStats(checklist);
                const weekLabel = (() => {
                  try {
                    const start = parseISO(checklist.week_start_date);
                    const end = parseISO(checklist.week_end_date);
                    return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
                  } catch {
                    return checklist.week_start_date;
                  }
                })();

                return (
                  <div
                    key={checklist.id}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {checklist.title || "Weekly Checklist"}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {weekLabel}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {weekStats.completed_items} / {weekStats.total_items}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {weekStats.completion_percentage}% complete
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {checklist.items.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                          No items
                        </p>
                      ) : (
                        checklist.items.map((item) => (
                          <ChecklistItem
                            key={item.id}
                            item={item}
                            onToggle={() => {}}
                            onUpdate={() => {}}
                            onDelete={() => {}}
                            isReadonly={true}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Current Week View */
        <div className="space-y-6">
          {/* Title Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleText}
                  onChange={(e) => setTitleText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") {
                      setEditingTitle(false);
                      setTitleText(currentChecklist.title || "");
                    }
                  }}
                  onBlur={handleSaveTitle}
                  autoFocus
                  placeholder="Checklist title (optional)"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <button
                onClick={() => setEditingTitle(true)}
                className="w-full text-left"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {currentChecklist.title || "Click to add title (optional)"}
                </h2>
              </button>
            )}
          </div>

          {/* Stats */}
          {stats.total_items > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  Progress
                </span>
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  {stats.completed_items} / {stats.total_items} completed
                </span>
              </div>
              <div className="mt-2 w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div
                  className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all"
                  style={{ width: `${stats.completion_percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Add New Item */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddItem();
                }
              }}
              placeholder="Add new checklist item..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddItem}
              disabled={!newItemText.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={20} />
              Add
            </button>
          </div>

          {/* Items List */}
          <div className="space-y-2">
            {currentChecklist.items.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-12 text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No items yet. Add your first item above!
                </p>
              </div>
            ) : (
              currentChecklist.items.map((item) => (
                <ChecklistItem
                  key={item.id}
                  item={item}
                  onToggle={() => handleToggleItem(item.id)}
                  onUpdate={(text) => handleUpdateItem(item.id, text)}
                  onDelete={() => handleDeleteItem(item.id)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

