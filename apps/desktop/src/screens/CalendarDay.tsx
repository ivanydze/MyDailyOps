/**
 * Calendar Day Screen
 * 
 * Full-screen day view with navigation and controls.
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { useTaskStore } from "../stores/taskStore";
import CalendarDayView from "../components/calendar/CalendarDayView";

export default function CalendarDayScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updateTask, deleteTask, fetchTasks } = useTaskStore();

  // Get date from URL params or use today
  const dateParam = searchParams.get("date");
  const initialDate = dateParam
    ? new Date(dateParam)
    : new Date();

  const [selectedDate, setSelectedDate] = useState(initialDate);

  // Update URL when date changes
  useEffect(() => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    navigate(`/calendar/day?date=${dateStr}`, { replace: true });
  }, [selectedDate, navigate]);

  // Fetch tasks on mount
  useEffect(() => {
    fetchTasks().catch((err) => {
      console.error("[CalendarDay] Error fetching tasks:", err);
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
      console.error("[CalendarDay] Error toggling task status:", error);
    }
  };

  // Handle add task - navigate to new task with date pre-filled
  const handleAddTask = (date?: Date) => {
    const dateStr = date ? format(date, "yyyy-MM-dd") : format(selectedDate, "yyyy-MM-dd");
    navigate(`/tasks/new?deadline=${dateStr}`);
  };

  // Handle date change
  const handleDateChange = (newDate: Date) => {
    setSelectedDate(newDate);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <CalendarDayView
        date={selectedDate}
        onDateChange={handleDateChange}
        onTaskClick={handleTaskClick}
        onAddTask={handleAddTask}
        onTaskToggleComplete={handleTaskToggleComplete}
      />
    </div>
  );
}

