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
import { isRecurringTemplate } from "../utils/recurring";
import toast from "react-hot-toast";

export default function CalendarDayScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updateTask, fetchTasks } = useTaskStore();

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
      // PROBLEM 9: Prevent completing recurring templates
      if (isRecurringTemplate(task)) {
        toast.error("Recurring templates cannot be completed. Only occurrences can be completed.");
        return;
      }
      
      const newStatus = task.status === "done" ? "pending" : "done";
      await updateTask(task.id, { status: newStatus });
      await fetchTasks(); // Refresh to get updated list
    } catch (error: any) {
      // Handle error from taskStore (template completion attempt)
      if (error.message && error.message.includes("Cannot complete recurring template")) {
        toast.error(error.message);
      } else {
        console.error("[CalendarDay] Error toggling task status:", error);
        toast.error("Failed to update task status");
      }
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

