/**
 * Calendar Month Screen
 * 
 * Full-screen month view with navigation and controls.
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, startOfMonth } from "date-fns";
import { useTaskStore } from "../stores/taskStore";
import CalendarMonthView from "../components/calendar/CalendarMonthView";

export default function CalendarMonthScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updateTask, fetchTasks } = useTaskStore();

  // Get month date from URL params or use current month
  const dateParam = searchParams.get("date");
  const initialDate = dateParam
    ? new Date(dateParam)
    : new Date();

  const [selectedMonth, setSelectedMonth] = useState(
    startOfMonth(initialDate)
  );

  // Update URL when month changes
  useEffect(() => {
    const dateStr = format(selectedMonth, "yyyy-MM-dd");
    navigate(`/calendar/month?date=${dateStr}`, { replace: true });
  }, [selectedMonth, navigate]);

  // Fetch tasks on mount
  useEffect(() => {
    fetchTasks().catch((err) => {
      console.error("[CalendarMonth] Error fetching tasks:", err);
    });
  }, [fetchTasks]);

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
      console.error("[CalendarMonth] Error toggling task status:", error);
    }
  };

  // Handle add task - navigate to new task
  const handleAddTask = (date?: Date) => {
    const dateStr = date ? format(date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
    navigate(`/tasks/new?deadline=${dateStr}`);
  };

  // Handle date change - navigate to day view
  const handleDateChange = (date: Date) => {
    navigate(`/calendar/day?date=${format(date, "yyyy-MM-dd")}`);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <CalendarMonthView
        month={selectedMonth}
        onDateChange={(date) => {
          const monthStart = startOfMonth(date);
          setSelectedMonth(monthStart);
        }}
        onTaskClick={handleTaskClick}
        onTaskToggleComplete={handleTaskToggleComplete}
        onAddTask={handleAddTask}
      />
    </div>
  );
}

