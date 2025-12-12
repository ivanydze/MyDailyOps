import { useState, useEffect } from "react";
import { useSettingsStore } from "../stores/settingsStore";
import { Settings, X, AlertTriangle, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { useTaskStore } from "../stores/taskStore";
import { useMemo } from "react";
import DeleteAllConfirmation from "../components/DeleteAllConfirmation";
import toast from "react-hot-toast";
import { getCommonTimezones, getCurrentTimezone } from "../utils/timezone";
import type { TimezoneOption } from "../utils/timezone";
import { checkForUpdates, getAppVersion } from "../services/updateService";
import { Download } from "lucide-react";

/**
 * Settings Screen
 * Implements Problem 8: Weekends Visibility Control settings
 */
export default function SettingsScreen() {
  const weekendFilter = useSettingsStore((state) => state.weekendFilter);
  const defaultTimezone = useSettingsStore((state) => state.defaultTimezone);
  const setDefaultTimezone = useSettingsStore((state) => state.setDefaultTimezone);
  const toggleWeekendVisibility = useSettingsStore((state) => state.toggleWeekendVisibility);
  const toggleCategoryOnWeekends = useSettingsStore((state) => state.toggleCategoryOnWeekends);
  const togglePriorityOnWeekends = useSettingsStore((state) => state.togglePriorityOnWeekends);
  
  const { tasks, softDeleteAllTasks } = useTaskStore();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDeleteAllConfirmation, setShowDeleteAllConfirmation] = useState(false);
  const [timezoneOptions, setTimezoneOptions] = useState<TimezoneOption[]>([]);
  const [appVersion, setAppVersion] = useState<string>('0.1.0');
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);

  // Initialize timezone options
  useEffect(() => {
    const options = getCommonTimezones();
    setTimezoneOptions(options);
    
    // If defaultTimezone is not set, initialize with current timezone
    if (!defaultTimezone) {
      setDefaultTimezone(getCurrentTimezone());
    }
  }, [defaultTimezone, setDefaultTimezone]);

  // Get app version on mount
  useEffect(() => {
    getAppVersion().then(setAppVersion).catch(() => {
      // Ignore errors, use default version
    });
  }, []);

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdates(true);
    try {
      const update = await checkForUpdates();
      if (update) {
        toast.success(`Update ${update.version} is available!`, {
          duration: 5000,
        });
      } else {
        toast.success('You are using the latest version');
      }
    } catch (error: any) {
      console.error('[Settings] Error checking for updates:', error);
      toast.error('Failed to check for updates');
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  // Get all unique categories from tasks
  const allCategories = useMemo(() => {
    const categories = new Set<string>();
    tasks.forEach((task) => {
      if (task.category) {
        categories.add(task.category);
      }
    });
    return Array.from(categories).sort();
  }, [tasks]);

  const handleDeleteAll = async () => {
    try {
      const count = await softDeleteAllTasks();
      toast.success(`Moved ${count} task${count !== 1 ? 's' : ''} to Trash. You can restore them from Trash.`);
      setShowDeleteAllConfirmation(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete tasks");
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-gray-900 dark:text-white" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Default Timezone Section (Problem 17) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Default Timezone
            </h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Set the default timezone for new tasks. This will be automatically selected when creating tasks with event times.
          </p>
          
          <div>
            <label
              htmlFor="defaultTimezone"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Timezone
            </label>
            <select
              id="defaultTimezone"
              value={defaultTimezone || getCurrentTimezone()}
              onChange={(e) => setDefaultTimezone(e.target.value)}
              className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {timezoneOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.abbreviation})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Current timezone: {getCurrentTimezone()}
            </p>
          </div>
        </div>

        {/* Weekend Visibility Control Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Weekend Visibility Control
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Control which tasks are shown on weekends (Saturday and Sunday). 
            High-priority tasks always remain visible regardless of these settings.
          </p>

          {/* Main Toggle */}
          <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  Show tasks on weekends
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  When enabled, all tasks are shown on weekends. When disabled, you can filter by category and priority.
                </p>
              </div>
              <button
                onClick={toggleWeekendVisibility}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  weekendFilter.showTasksOnWeekends
                    ? "bg-blue-600"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    weekendFilter.showTasksOnWeekends ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Category Filters (only shown when weekend filtering is enabled) */}
          {!weekendFilter.showTasksOnWeekends && (
            <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
              <label className="text-sm font-medium text-gray-900 dark:text-white mb-3 block">
                Hide categories on weekends
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Select categories to hide on weekends. Tasks with these categories will not appear in Today view on weekends.
              </p>
              
              {allCategories.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  No categories found in your tasks. Create tasks with categories to see them here.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allCategories.map((category) => {
                    const isHidden = weekendFilter.hiddenCategoriesOnWeekends.includes(category);
                    return (
                      <button
                        key={category}
                        onClick={() => toggleCategoryOnWeekends(category)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          isHidden
                            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Priority Filters (only shown when weekend filtering is enabled) */}
          {!weekendFilter.showTasksOnWeekends && (
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-white mb-3 block">
                Hide priorities on weekends
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Select priorities to hide on weekends. High-priority tasks are always visible.
              </p>
              
              <div className="flex flex-wrap gap-2">
                {(['low', 'medium'] as const).map((priority) => {
                  const isHidden = weekendFilter.hiddenPrioritiesOnWeekends.includes(priority);
                  const priorityLabels = {
                    low: 'Low Priority',
                    medium: 'Medium Priority',
                  };
                  
                  return (
                    <button
                      key={priority}
                      onClick={() => togglePriorityOnWeekends(priority)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isHidden
                          ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {priorityLabels[priority]}
                    </button>
                  );
                })}
                <div className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700">
                  High Priority (Always Visible)
                </div>
              </div>
            </div>
          )}
        </div>

        {/* App Updates Section (Problem 20) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Download className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              App Updates
            </h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Current version: <span className="font-mono font-semibold">{appVersion}</span>
          </p>
          <button
            onClick={handleCheckForUpdates}
            disabled={isCheckingUpdates}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isCheckingUpdates ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Checking...
              </>
            ) : (
              <>
                <Download size={16} />
                Check for Updates
              </>
            )}
          </button>
        </div>

        {/* Advanced Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between mb-4"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Advanced
            </h2>
            {showAdvanced ? (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-500" />
            )}
          </button>

          {showAdvanced && (
            <div>
              {/* Danger Zone */}
              <div className="border border-red-200 dark:border-red-900 rounded-lg p-4 bg-red-50 dark:bg-red-900/10">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <h3 className="text-base font-semibold text-red-900 dark:text-red-300">
                    Danger Zone
                  </h3>
                </div>
                <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                  These actions are permanent and cannot be undone. Tasks will be moved to Trash and can be restored within 30 days.
                </p>
                
                <button
                  onClick={() => setShowDeleteAllConfirmation(true)}
                  className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Delete All Tasks ({tasks.length})
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete All Confirmation Modal */}
      {showDeleteAllConfirmation && (
        <DeleteAllConfirmation
          taskCount={tasks.length}
          onConfirm={handleDeleteAll}
          onCancel={() => setShowDeleteAllConfirmation(false)}
        />
      )}
    </div>
  );
}

