/**
 * Formatting Utilities
 */

import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday } from "date-fns";

/**
 * Format a date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  
  if (isToday(d)) {
    return "Today";
  }
  
  if (isTomorrow(d)) {
    return "Tomorrow";
  }
  
  if (isYesterday(d)) {
    return "Yesterday";
  }
  
  return format(d, "MMM d, yyyy");
}

/**
 * Format a date with time
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MMM d, yyyy 'at' h:mm a");
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Format priority for display
 */
export function formatPriority(priority: "low" | "medium" | "high"): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

