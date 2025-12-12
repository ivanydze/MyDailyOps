/**
 * Travel Event Item Component
 * 
 * Component for rendering a single travel event in calendar views.
 * Problem 16: Travel Events (Trips)
 */

import { Plane, MapPin } from "lucide-react";
import type { TravelEvent } from "@mydailyops/core";

interface TravelEventItemProps {
  event: TravelEvent;
  date: Date;                      // The day this event appears on
  compact?: boolean;               // Compact mode for month view
  onClick?: (event: TravelEvent) => void;
}

export default function TravelEventItem({
  event,
  date,
  compact = false,
  onClick,
}: TravelEventItemProps) {
  // Parse dates to check if this is start/end day
  const eventStart = new Date(event.start_date);
  const eventEnd = new Date(event.end_date);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  eventStart.setHours(0, 0, 0, 0);
  eventEnd.setHours(0, 0, 0, 0);

  const isStartDay = checkDate.getTime() === eventStart.getTime();
  const isEndDay = checkDate.getTime() === eventEnd.getTime();
  const isSingleDay = eventStart.getTime() === eventEnd.getTime();
  const isMiddleDay = !isStartDay && !isEndDay && !isSingleDay;

  // Get color, default to blue
  const eventColor = event.color || '#3B82F6';

  return (
    <div
      className={`rounded-md p-1.5 text-xs cursor-pointer hover:shadow-sm transition-all border-l-2 ${
        compact ? 'p-1' : 'p-1.5'
      }`}
      style={{
        borderLeftColor: eventColor,
        backgroundColor: `${eventColor}15`, // 15% opacity
      }}
      onClick={() => onClick?.(event)}
      title={`${event.name}${event.location ? ` - ${event.location}` : ''}`}
    >
      <div className="flex items-center gap-1.5">
        {/* Icon */}
        <Plane
          size={compact ? 12 : 14}
          className="flex-shrink-0"
          style={{ color: eventColor }}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Event name */}
          <div
            className="font-medium truncate"
            style={{ color: eventColor }}
          >
            {event.name}
          </div>

          {/* Location and date info (if not compact) */}
          {!compact && (
            <div className="flex items-center gap-1.5 mt-0.5">
              {event.location && (
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <MapPin size={10} />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
              {(isStartDay || isSingleDay) && (
                <span className="text-gray-500 dark:text-gray-500 text-[10px]">
                  {isSingleDay ? 'Today' : 'Start'}
                </span>
              )}
              {isEndDay && !isStartDay && (
                <span className="text-gray-500 dark:text-gray-500 text-[10px]">
                  End
                </span>
              )}
              {isMiddleDay && (
                <span className="text-gray-500 dark:text-gray-500 text-[10px]">
                  Ongoing
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

