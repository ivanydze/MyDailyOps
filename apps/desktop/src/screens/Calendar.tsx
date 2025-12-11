/**
 * Main Calendar Screen
 * 
 * Unified calendar screen with view switching (Day/Week/Month/Year).
 * Provides navigation between different calendar views and date controls.
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, getYear, startOfYear, startOfWeek, startOfMonth } from "date-fns";
import { Calendar, Grid, LayoutGrid, Calendar as CalendarIcon } from "lucide-react";
import { useTaskStore } from "../stores/taskStore";
import CalendarDayView from "../components/calendar/CalendarDayView";
import CalendarWeekView from "../components/calendar/CalendarWeekView";
import CalendarMonthView from "../components/calendar/CalendarMonthView";
import CalendarYearView from "../components/calendar/CalendarYearView";

type CalendarView = 'day' | 'week' | 'month' | 'year';

export default function Calendar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { fetchTasks, updateTask } = useTaskStore();

  // Get view and date from URL params
  const viewParam = searchParams.get("view") || 'month';
  const dateParam = searchParams.get("date");
  
  // Validate and set view
  const [view, setView] = useState<CalendarView>(
    (['day', 'week', 'month', 'year'].includes(viewParam) ? viewParam : 'month') as CalendarView
  );
  
  // Initialize date based on param or use today
  const initialDate = dateParam ? new Date(dateParam) : new Date();
  
  // Calculate initial date based on view
  const getInitialDate = (viewType: CalendarView, date: Date): Date => {
    switch (viewType) {
      case 'day':
        return date;
      case 'week':
        return startOfWeek(date, { weekStartsOn: 0 });
      case 'month':
        return startOfMonth(date);
      case 'year':
        return startOfYear(date);
      default:
        return date;
    }
  };

  const [selectedDate, setSelectedDate] = useState(getInitialDate(view, initialDate));
  const [includeCompleted, setIncludeCompleted] = useState(false);

  // Update URL when view or date changes
  useEffect(() => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const url = `/calendar?view=${view}&date=${dateStr}${includeCompleted ? '&completed=1' : ''}`;
    navigate(url, { replace: true });
  }, [view, selectedDate, includeCompleted, navigate]);

  // Read includeCompleted from URL
  useEffect(() => {
    const completedParam = searchParams.get("completed");
    if (completedParam === "1") {
      setIncludeCompleted(true);
    }
  }, [searchParams]);

  // Fetch tasks on mount
  useEffect(() => {
    fetchTasks().catch((err) => {
      console.error("[Calendar] Error fetching tasks:", err);
    });
  }, [fetchTasks]);

  // Handle view change
  const handleViewChange = (newView: CalendarView) => {
    setView(newView);
    // Adjust date based on new view if needed
    const adjustedDate = getInitialDate(newView, selectedDate);
    setSelectedDate(adjustedDate);
  };

  // Handle task click - navigate to edit
  const handleTaskClick = (task: any) => {
    navigate(`/tasks/${task.id}/edit`);
  };

  // Handle task toggle complete
  const handleTaskToggleComplete = async (task: any) => {
    try {
      const newStatus = task.status === "done" ? "pending" : "done";
      await updateTask(task.id, { status: newStatus });
      await fetchTasks(); // Refresh to get updated list
    } catch (error) {
      console.error("[Calendar] Error toggling task status:", error);
    }
  };

  // Handle add task - navigate to new task
  const handleAddTask = (date?: Date) => {
    const dateStr = date ? format(date, "yyyy-MM-dd") : format(selectedDate, "yyyy-MM-dd");
    navigate(`/tasks/new?deadline=${dateStr}`);
  };

  // Handle date change
  const handleDateChange = (date: Date) => {
    // For day view, navigate to day view
    // For other views, update the selected date
    if (view === 'day') {
      setSelectedDate(date);
    } else {
      const adjustedDate = getInitialDate(view, date);
      setSelectedDate(adjustedDate);
    }
  };

  // View selector buttons
  const viewButtons = [
    { id: 'day' as CalendarView, label: 'Day', icon: Calendar },
    { id: 'week' as CalendarView, label: 'Week', icon: CalendarIcon },
    { id: 'month' as CalendarView, label: 'Month', icon: Grid },
    { id: 'year' as CalendarView, label: 'Year', icon: LayoutGrid },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header with View Selector and Settings */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          {/* View Selector */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {viewButtons.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleViewChange(id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  view === id
                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="flex items-center gap-4">
          {/* Include Completed Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeCompleted}
              onChange={(e) => setIncludeCompleted(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Include completed
            </span>
          </label>
        </div>
      </div>

      {/* Calendar View Content */}
      <div className="flex-1">
        {view === 'day' && (
          <CalendarDayView
            date={selectedDate}
            includeCompleted={includeCompleted}
            onDateChange={handleDateChange}
            onTaskClick={handleTaskClick}
            onTaskToggleComplete={handleTaskToggleComplete}
            onAddTask={handleAddTask}
          />
        )}

        {view === 'week' && (
          <CalendarWeekView
            weekStartDate={selectedDate}
            includeCompleted={includeCompleted}
            onDateChange={handleDateChange}
            onTaskClick={handleTaskClick}
            onTaskToggleComplete={handleTaskToggleComplete}
            onAddTask={handleAddTask}
          />
        )}

        {view === 'month' && (
          <CalendarMonthView
            month={selectedDate}
            includeCompleted={includeCompleted}
            onDateChange={handleDateChange}
            onTaskClick={handleTaskClick}
            onTaskToggleComplete={handleTaskToggleComplete}
            onAddTask={handleAddTask}
          />
        )}

        {view === 'year' && (
          <CalendarYearView
            year={getYear(selectedDate)}
            includeCompleted={includeCompleted}
            onMonthClick={(monthStart) => {
              setView('month');
              setSelectedDate(startOfMonth(monthStart));
            }}
            onDateChange={handleDateChange}
            onTaskClick={handleTaskClick}
            onAddTask={handleAddTask}
          />
        )}
      </div>
    </div>
  );
}

