/**
 * Calendar Week Screen
 * 
 * Full-screen week view with navigation and controls.
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, startOfWeek } from "date-fns";
import { useTaskStore } from "../stores/taskStore";
import CalendarWeekView from "../components/calendar/CalendarWeekView";
import { isRecurringTemplate } from "../utils/recurring";
import toast from "react-hot-toast";

export default function CalendarWeekScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updateTask, fetchTasks } = useTaskStore();

  // Get week start date from URL params or use current week
  const dateParam = searchParams.get("date");
  const initialDate = dateParam
    ? new Date(dateParam)
    : new Date();

  const [selectedWeekStart, setSelectedWeekStart] = useState(
    startOfWeek(initialDate, { weekStartsOn: 0 })
  );

  // Update URL when week changes
  useEffect(() => {
    const dateStr = format(selectedWeekStart, "yyyy-MM-dd");
    navigate(`/calendar/week?date=${dateStr}`, { replace: true });
  }, [selectedWeekStart, navigate]);

  // Fetch tasks on mount
  useEffect(() => {
    fetchTasks().catch((err) => {
      console.error("[CalendarWeek] Error fetching tasks:", err);
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
        console.error("[CalendarWeek] Error toggling task status:", error);
        toast.error("Failed to update task status");
      }
    }
  };

  // Handle add task - navigate to new task
  const handleAddTask = (date?: Date) => {
    const dateStr = date ? format(date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
    navigate(`/tasks/new?deadline=${dateStr}`);
  };

  // handleDateChange is passed to CalendarWeekView component via onDateChange prop

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <CalendarWeekView
        weekStartDate={selectedWeekStart}
        onDateChange={(date) => {
          const weekStart = startOfWeek(date, { weekStartsOn: 0 });
          setSelectedWeekStart(weekStart);
        }}
        onTaskClick={handleTaskClick}
        onTaskToggleComplete={handleTaskToggleComplete}
        onAddTask={handleAddTask}
      />
    </div>
  );
}

