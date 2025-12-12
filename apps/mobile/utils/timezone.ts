/**
 * Timezone Utilities
 * 
 * Core utilities for timezone-safe time handling (Problem 17)
 * These functions ensure that task event times are never auto-converted
 * and always display correctly regardless of user's current timezone.
 * 
 * Key principles:
 * - event_time is stored as HH:mm (e.g., "14:00")
 * - event_timezone is stored as IANA timezone (e.g., "Europe/London")
 * - Time is NEVER auto-converted when saving
 * - UI shows both original and local times (if they differ)
 */

/**
 * Get user's current timezone
 * Returns IANA timezone identifier (e.g., "America/New_York", "Europe/London")
 */
export function getCurrentTimezone(): string {
  try {
    // Use Intl.DateTimeFormat to get user's timezone
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    // Fallback to UTC if timezone detection fails
    console.warn('[Timezone] Failed to detect timezone, using UTC:', error);
    return 'UTC';
  }
}

/**
 * Get timezone abbreviation (e.g., "GMT", "EST", "PST")
 * @param timezone IANA timezone identifier
 * @param date Optional date for DST-aware abbreviations
 */
export function getTimezoneAbbreviation(timezone: string, date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'short',
    });
    const parts = formatter.formatToParts(date);
    const timezoneName = parts.find(part => part.type === 'timeZoneName');
    return timezoneName?.value || timezone.split('/').pop()?.replace('_', ' ') || timezone;
  } catch (error) {
    console.warn(`[Timezone] Failed to get abbreviation for ${timezone}:`, error);
    return timezone.split('/').pop()?.replace('_', ' ') || timezone;
  }
}

/**
 * Convert event time from one timezone to another
 * 
 * @param eventTime Time in HH:mm format (e.g., "14:00")
 * @param eventTimezone Source timezone (IANA identifier)
 * @param targetTimezone Target timezone (IANA identifier)
 * @param referenceDate Optional date for the conversion (defaults to today)
 * @returns Time in HH:mm format in target timezone
 */
export function getEventTimeInTimezone(
  eventTime: string,
  eventTimezone: string,
  targetTimezone: string,
  referenceDate: Date = new Date()
): string {
  try {
    // Parse time (HH:mm format)
    const [hours, minutes] = eventTime.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      console.warn(`[Timezone] Invalid event time format: ${eventTime}`);
      return eventTime; // Return original if invalid
    }

    // Convert "HH:mm in eventTimezone" to "HH:mm in targetTimezone"
    // Strategy: Find the UTC timestamp that displays as eventTime in eventTimezone,
    // then format that same UTC timestamp in targetTimezone
    
    // Get reference date components
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    const day = referenceDate.getDate();
    
    // Use iterative approach to find the correct UTC time
    // Start with a guess: assume the time is at noon UTC for the reference date
    let guessUtc = new Date(Date.UTC(year, month, day, 12, 0, 0));
    
    // Try to find UTC time that, when formatted in eventTimezone, equals eventTime
    // We'll iterate to refine the guess
    for (let iteration = 0; iteration < 15; iteration++) {
      const formatter = new Intl.DateTimeFormat('en', {
        timeZone: eventTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      
      const parts = formatter.formatToParts(guessUtc);
      const formattedHour = parseInt(parts.find(p => p.type === 'hour')!.value);
      const formattedMinute = parseInt(parts.find(p => p.type === 'minute')!.value);
      
      // Calculate difference in minutes
      const targetMinutes = hours * 60 + minutes;
      const currentMinutes = formattedHour * 60 + formattedMinute;
      const diffMinutes = targetMinutes - currentMinutes;
      
      // If we're close enough (within 1 minute), we're done
      if (Math.abs(diffMinutes) < 1) {
        break;
      }
      
      // Adjust guess by the difference (convert minutes to milliseconds)
      guessUtc = new Date(guessUtc.getTime() + diffMinutes * 60 * 1000);
    }
    
    // Now format the same UTC time in target timezone
    const targetFormatter = new Intl.DateTimeFormat('en', {
      timeZone: targetTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    
    const targetParts = targetFormatter.formatToParts(guessUtc);
    let targetHour = parseInt(targetParts.find(p => p.type === 'hour')!.value);
    const targetMinute = parseInt(targetParts.find(p => p.type === 'minute')!.value);
    
    // Normalize hour if it's 24 (some formatters return 24:00 for midnight)
    if (targetHour === 24) {
      targetHour = 0;
    }
    
    const hourStr = String(targetHour).padStart(2, '0');
    const minuteStr = String(targetMinute).padStart(2, '0');
    
    return `${hourStr}:${minuteStr}`;
  } catch (error) {
    console.error(`[Timezone] Error converting time from ${eventTimezone} to ${targetTimezone}:`, error);
    return eventTime; // Return original on error
  }
}

/**
 * Format time with timezone information
 * Returns both original time (with its timezone) and local time
 * 
 * @param time Time in HH:mm format
 * @param timezone Timezone for the time (IANA identifier)
 * @param localTimezone User's local timezone (IANA identifier)
 * @returns Object with original and local time strings
 */
export function formatTimeWithTimezone(
  time: string,
  timezone: string,
  localTimezone: string
): { original: string; local: string; originalAbbr: string; localAbbr: string } {
  const originalAbbr = getTimezoneAbbreviation(timezone);
  const localAbbr = getTimezoneAbbreviation(localTimezone);
  
  const originalTime = `${time} (${originalAbbr})`;
  
  // If timezones are the same, local time equals original
  if (timezone === localTimezone) {
    return {
      original: originalTime,
      local: originalTime,
      originalAbbr,
      localAbbr,
    };
  }
  
  // Convert to local timezone
  const localTime = getEventTimeInTimezone(time, timezone, localTimezone);
  const localTimeStr = `${localTime} (${localAbbr})`;
  
  return {
    original: originalTime,
    local: localTimeStr,
    originalAbbr,
    localAbbr,
  };
}

/**
 * Format event time for display in task UI
 * Shows both original timezone and local time (if different)
 * 
 * @param task Task object with event_time and event_timezone
 * @param localTimezone User's local timezone (optional, defaults to current timezone)
 * @returns Formatted time string for display
 */
export function formatEventTime(task: any, localTimezone?: string): string {
  const eventTime = task.event_time;
  const eventTimezone = task.event_timezone;
  
  // If task has no event time, return empty string
  if (!eventTime || !eventTimezone) {
    return '';
  }
  
  const userTimezone = localTimezone || getCurrentTimezone();
  const formatted = formatTimeWithTimezone(eventTime, eventTimezone, userTimezone);
  
  // If timezones match, show only one time
  if (eventTimezone === userTimezone) {
    return formatted.original;
  }
  
  // Show both times
  return `${formatted.original} / ${formatted.local}`;
}

/**
 * Validate timezone identifier (IANA format)
 * @param timezone Timezone to validate
 * @returns true if valid, false otherwise
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    // Try to use the timezone with Intl API
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get common timezones list for timezone picker UI
 * Returns list of popular timezones with their display names
 */
export interface TimezoneOption {
  value: string;
  label: string;
  abbreviation: string;
}

export function getCommonTimezones(): TimezoneOption[] {
  const commonTimezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'America/Toronto',
    'America/Vancouver',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Rome',
    'Europe/Madrid',
    'Europe/Moscow',
    'Asia/Dubai',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Hong_Kong',
    'Asia/Singapore',
    'Asia/Kolkata',
    'Australia/Sydney',
    'Australia/Melbourne',
    'Pacific/Auckland',
    'UTC',
  ];
  
  const now = new Date();
  
  return commonTimezones.map(tz => ({
    value: tz,
    label: tz.replace(/_/g, ' '),
    abbreviation: getTimezoneAbbreviation(tz, now),
  })).sort((a, b) => a.label.localeCompare(b.label));
}

