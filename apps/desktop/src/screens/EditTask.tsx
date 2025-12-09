import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTaskStore } from "../stores/taskStore";
import toast from "react-hot-toast";
import type { TaskPriority, TaskStatus, RecurringOptions } from "@mydailyops/core";
import { Save, X, Loader2, Calendar, XCircle } from "lucide-react";
import DatePicker from "react-datepicker";

export default function EditTask() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tasks, updateTask, fetchTasks, deleteTask } = useTaskStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [category, setCategory] = useState("General");
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [pinned, setPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Recurring options state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState<RecurringOptions['type']>("none");
  const [intervalDays, setIntervalDays] = useState<string>("");
  const [selectedWeekdays, setSelectedWeekdays] = useState<RecurringOptions['weekdays']>([]);
  const [dayOfMonth, setDayOfMonth] = useState<string>("");
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [generateAhead, setGenerateAhead] = useState<{
    generate_unit: 'days' | 'weeks' | 'months';
    generate_value: number;
    custom: boolean;
  }>({
    generate_unit: 'days',
    generate_value: 7,
    custom: false,
  });

  const weekdayOptions: { value: RecurringOptions['weekdays'][0]; label: string }[] = [
    { value: 'sun', label: 'Sunday' },
    { value: 'mon', label: 'Monday' },
    { value: 'tue', label: 'Tuesday' },
    { value: 'wed', label: 'Wednesday' },
    { value: 'thu', label: 'Thursday' },
    { value: 'fri', label: 'Friday' },
    { value: 'sat', label: 'Saturday' },
  ];

  const weekNumberOptions = [
    { value: 1, label: '1st' },
    { value: 2, label: '2nd' },
    { value: 3, label: '3rd' },
    { value: 4, label: '4th' },
    { value: -1, label: 'Last' },
  ];

  useEffect(() => {
    const loadTask = async () => {
      if (!id) {
        toast.error("Task ID is missing");
        navigate("/tasks");
        return;
      }

      setIsLoading(true);
      await fetchTasks();

      const task = tasks.find((t) => t.id === id);

      if (!task) {
        toast.error("Task not found");
        navigate("/tasks");
        return;
      }

      setTitle(task.title);
      setDescription(task.description || "");
      setPriority(task.priority);
      setCategory(task.category || "General");
      setDeadline(task.deadline ? new Date(task.deadline) : null);
      setStatus(task.status);
      setPinned(task.pinned || false);

      // Load recurring options
      if (task.recurring_options) {
        setIsRecurring(true);
        setRecurringType(task.recurring_options.type);
        setIntervalDays(task.recurring_options.interval_days?.toString() || "");
        setSelectedWeekdays(task.recurring_options.weekdays || []);
        setDayOfMonth(task.recurring_options.dayOfMonth?.toString() || "");
        setWeekNumber(task.recurring_options.weekNumber || 1);
        if (task.recurring_options.generate_unit && task.recurring_options.generate_value !== undefined) {
          setGenerateAhead({
            generate_unit: task.recurring_options.generate_unit,
            generate_value: task.recurring_options.generate_value,
            custom: task.recurring_options.custom || false,
          });
        }
      } else {
        setIsRecurring(false);
        setRecurringType("none");
      }

      setIsLoading(false);
    };

    loadTask();
  }, [id, navigate, fetchTasks, tasks]);

  const toggleWeekday = (weekday: RecurringOptions['weekdays'][0]) => {
    setSelectedWeekdays(prev => {
      if (prev.includes(weekday)) {
        return prev.filter(w => w !== weekday);
      } else {
        return [...prev, weekday];
      }
    });
  };

  const buildRecurringOptions = (): RecurringOptions | null => {
    if (!isRecurring || recurringType === "none") {
      return null;
    }

    switch (recurringType) {
      case 'daily':
        return {
          type: 'daily',
          generate_unit: generateAhead.generate_unit,
          generate_value: generateAhead.generate_value,
          custom: generateAhead.custom,
        };

      case 'interval':
        const days = parseInt(intervalDays, 10);
        if (!days || days < 1) return null;
        return {
          type: 'interval',
          interval_days: days,
          generate_unit: generateAhead.generate_unit,
          generate_value: generateAhead.generate_value,
          custom: generateAhead.custom,
        };

      case 'weekly':
        if (selectedWeekdays.length === 0) return null;
        return {
          type: 'weekly',
          weekdays: [...selectedWeekdays],
          generate_unit: generateAhead.generate_unit,
          generate_value: generateAhead.generate_value,
          custom: generateAhead.custom,
        };

      case 'monthly_date':
        const day = parseInt(dayOfMonth, 10);
        if (!day || day < 1 || day > 31) return null;
        return {
          type: 'monthly_date',
          dayOfMonth: day,
          generate_unit: generateAhead.generate_unit,
          generate_value: generateAhead.generate_value,
          custom: generateAhead.custom,
        };

      case 'monthly_weekday':
        if (selectedWeekdays.length === 0) return null;
        return {
          type: 'monthly_weekday',
          weekdays: [selectedWeekdays[0]],
          weekNumber: weekNumber,
          generate_unit: generateAhead.generate_unit,
          generate_value: generateAhead.generate_value,
          custom: generateAhead.custom,
        };

      default:
        return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !id) {
      toast.error("Title is required");
      return;
    }

    if (isRecurring) {
      const recurringOpts = buildRecurringOptions();
      if (!recurringOpts) {
        toast.error("Please complete recurring settings");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const recurringOptions = buildRecurringOptions();

      await updateTask(id, {
        title: title.trim(),
        description: description.trim(),
        priority,
        category: category.trim() || "General",
        deadline: deadline ? deadline.toISOString() : null,
        status,
        pinned,
        recurring_options: recurringOptions,
      });

      toast.success("Task updated successfully!");
      navigate("/tasks");
    } catch (error: any) {
      toast.error(error.message || "Failed to update task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    if (!window.confirm("Are you sure you want to delete this task?")) {
      return;
    }

    try {
      await deleteTask(id);
      toast.success("Task deleted successfully!");
      navigate("/tasks");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete task");
    }
  };

  const formatDeadline = (date: Date | null): string => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleRecurringTypeChange = (newType: RecurringOptions['type']) => {
    setRecurringType(newType);
    setIntervalDays("");
    setSelectedWeekdays([]);
    setDayOfMonth("");
    setWeekNumber(1);

    switch (newType) {
      case 'daily':
        setGenerateAhead({ generate_unit: 'days', generate_value: 7, custom: false });
        break;
      case 'weekly':
        setGenerateAhead({ generate_unit: 'weeks', generate_value: 4, custom: false });
        break;
      case 'monthly_date':
      case 'monthly_weekday':
        setGenerateAhead({ generate_unit: 'months', generate_value: 3, custom: false });
        break;
      case 'interval':
        setGenerateAhead({ generate_unit: 'days', generate_value: 7, custom: false });
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading task...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Edit Task
        </h1>
        <button
          onClick={() => navigate("/tasks")}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <X size={20} />
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter task title"
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            placeholder="Enter task description"
          />
        </div>

        {/* Priority and Category */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="priority"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Priority
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="General">General</option>
              <option value="Work">Work</option>
              <option value="Personal">Personal</option>
              <option value="Shopping">Shopping</option>
              <option value="Health">Health</option>
              <option value="Finance">Finance</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Deadline with Date Picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Deadline
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <span className={deadline ? "" : "text-gray-500 dark:text-gray-400"}>
                {deadline ? formatDeadline(deadline) : "Select date & time"}
              </span>
              <div className="flex items-center gap-2">
                {deadline && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeadline(null);
                    }}
                    className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <XCircle size={18} />
                  </button>
                )}
                <Calendar size={18} />
              </div>
            </button>
            {showDatePicker && (
              <div className="absolute z-10 mt-1">
                <DatePicker
                  selected={deadline}
                  onChange={(date: Date | null) => {
                    setDeadline(date);
                    setShowDatePicker(false);
                  }}
                  showTimeSelect
                  timeIntervals={15}
                  dateFormat="MMMM d, yyyy h:mm aa"
                  minDate={new Date()}
                  inline
                  className="border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg bg-white dark:bg-gray-800"
                />
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>

        {/* Recurring Section */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Recurring Task
            </label>
            <button
              type="button"
              onClick={() => {
                setIsRecurring(!isRecurring);
                if (!isRecurring && recurringType === "none") {
                  setRecurringType("daily");
                } else if (!isRecurring) {
                  setRecurringType("none");
                }
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isRecurring ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isRecurring ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {isRecurring && (
            <div className="space-y-4 mt-4">
              {/* Recurring Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Repeat Pattern
                </label>
                <div className="space-y-2">
                  {[
                    { value: "daily", label: "Daily" },
                    { value: "weekly", label: "Weekly" },
                    { value: "monthly_date", label: "Monthly (Date)" },
                    { value: "monthly_weekday", label: "Monthly (Weekday)" },
                    { value: "interval", label: "Interval (Custom Days)" },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="recurringType"
                        value={option.value}
                        checked={recurringType === option.value}
                        onChange={() => handleRecurringTypeChange(option.value as RecurringOptions['type'])}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Interval Days */}
              {recurringType === "interval" && (
                <div>
                  <label
                    htmlFor="intervalDays"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Repeat every (days)
                  </label>
                  <input
                    id="intervalDays"
                    type="number"
                    min="1"
                    value={intervalDays}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || (!isNaN(Number(val)) && Number(val) >= 1)) {
                        setIntervalDays(val);
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., 3"
                  />
                </div>
              )}

              {/* Weekly Weekdays */}
              {recurringType === "weekly" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Weekdays
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {weekdayOptions.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedWeekdays.includes(option.value)}
                          onChange={() => toggleWeekday(option.value)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  {selectedWeekdays.length === 0 && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Please select at least one weekday
                    </p>
                  )}
                </div>
              )}

              {/* Monthly Date */}
              {recurringType === "monthly_date" && (
                <div>
                  <label
                    htmlFor="dayOfMonth"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Day of Month (1-31)
                  </label>
                  <input
                    id="dayOfMonth"
                    type="number"
                    min="1"
                    max="31"
                    value={dayOfMonth}
                    onChange={(e) => {
                      const val = e.target.value;
                      const num = parseInt(val, 10);
                      if (val === "" || (!isNaN(num) && num >= 1 && num <= 31)) {
                        setDayOfMonth(val);
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., 15"
                  />
                </div>
              )}

              {/* Monthly Weekday */}
              {recurringType === "monthly_weekday" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Weekday
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {weekdayOptions.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center space-x-2 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="monthlyWeekday"
                            checked={selectedWeekdays[0] === option.value}
                            onChange={() => setSelectedWeekdays([option.value])}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {option.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Week Number
                    </label>
                    <div className="space-y-2">
                      {weekNumberOptions.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center space-x-2 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="weekNumber"
                            value={option.value}
                            checked={weekNumber === option.value}
                            onChange={() => setWeekNumber(option.value)}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {option.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Generate Ahead */}
              {(recurringType !== "none" && recurringType !== "monthly_weekday") && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Generate Ahead
                    </label>
                    <select
                      value={generateAhead.generate_unit}
                      onChange={(e) =>
                        setGenerateAhead({
                          ...generateAhead,
                          generate_unit: e.target.value as 'days' | 'weeks' | 'months',
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Amount
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={generateAhead.generate_value}
                      onChange={(e) =>
                        setGenerateAhead({
                          ...generateAhead,
                          generate_value: parseInt(e.target.value, 10) || 7,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pinned */}
        <div className="flex items-center">
          <input
            id="pinned"
            type="checkbox"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label
            htmlFor="pinned"
            className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Pin this task
          </label>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleDelete}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            disabled={isSubmitting}
          >
            Delete Task
          </button>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/tasks")}
              className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={20} />
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
