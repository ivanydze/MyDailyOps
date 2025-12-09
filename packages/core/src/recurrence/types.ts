/**
 * Recurrence Types and Enums
 */

import type { RecurringOptions } from "../models/task";

export type RecurringType =
  | "none"
  | "daily"
  | "interval"
  | "weekly"
  | "monthly_date"
  | "monthly_weekday";

export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export type GenerateUnit = "days" | "weeks" | "months";

export interface RecurrenceConfig {
  type: RecurringType;
  interval_days?: number;
  weekdays?: Weekday[];
  dayOfMonth?: number;
  weekNumber?: number;
  generate_unit?: GenerateUnit;
  generate_value?: number;
  custom?: boolean;
}

export interface NextOccurrenceResult {
  date: Date;
  isValid: boolean;
}

export interface GenerateOptions {
  fromDate?: Date;
  count?: number;
  endDate?: Date;
}

