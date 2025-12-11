/**
 * Calendar Year Screen
 * 
 * Full-screen year view with navigation and controls.
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, getYear, startOfYear } from "date-fns";
import { useTaskStore } from "../stores/taskStore";
import CalendarYearView from "../components/calendar/CalendarYearView";

export default function CalendarYearScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { fetchTasks } = useTaskStore();

  // Get year from URL params or use current year
  const dateParam = searchParams.get("date");
  const initialDate = dateParam
    ? new Date(dateParam)
    : new Date();

  const [selectedYear, setSelectedYear] = useState(
    getYear(initialDate)
  );

  // Update URL when year changes
  useEffect(() => {
    const yearStart = startOfYear(new Date(selectedYear, 0, 1));
    const dateStr = format(yearStart, "yyyy-MM-dd");
    navigate(`/calendar/year?date=${dateStr}`, { replace: true });
  }, [selectedYear, navigate]);

  // Fetch tasks on mount
  useEffect(() => {
    fetchTasks().catch((err) => {
      console.error("[CalendarYear] Error fetching tasks:", err);
    });
  }, [fetchTasks]);

  // Handle task click - navigate to edit
  const handleTaskClick = (task: any) => {
    navigate(`/tasks/${task.id}/edit`);
  };

  // Handle add task - navigate to new task
  const handleAddTask = (date?: Date) => {
    const dateStr = date ? format(date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
    navigate(`/tasks/new?deadline=${dateStr}`);
  };

  // Handle month click - navigate to month view
  const handleMonthClick = (monthStart: Date) => {
    navigate(`/calendar/month?date=${format(monthStart, "yyyy-MM-dd")}`);
  };

  // Handle date change - navigate to day view
  const handleDateChange = (date: Date) => {
    navigate(`/calendar/day?date=${format(date, "yyyy-MM-dd")}`);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <CalendarYearView
        year={selectedYear}
        onMonthClick={handleMonthClick}
        onDateChange={handleDateChange}
        onTaskClick={handleTaskClick}
        onAddTask={handleAddTask}
      />
    </div>
  );
}

