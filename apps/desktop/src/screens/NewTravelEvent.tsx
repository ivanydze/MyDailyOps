/**
 * New Travel Event Screen
 * Problem 16: Travel Events (Trips)
 * 
 * Screen for creating a new travel event
 */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTravelEventStore } from "../stores/travelEventStore";
import { TRAVEL_EVENT_COLORS } from "@mydailyops/core";
import toast from "react-hot-toast";
import { Save, X, Calendar, MapPin, Palette } from "lucide-react";
import DatePicker from "react-datepicker";
import { format, startOfDay } from "date-fns";

export default function NewTravelEvent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addTravelEvent } = useTravelEventStore();

  // Get initial date from URL params (if provided from Calendar)
  const dateParam = searchParams.get("date");
  const initialDate = dateParam ? new Date(dateParam) : new Date();

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState<Date>(startOfDay(initialDate));
  const [endDate, setEndDate] = useState<Date>(startOfDay(initialDate));
  const [color, setColor] = useState<string>(TRAVEL_EVENT_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Initialize end date to same as start date
  useEffect(() => {
    setEndDate(startOfDay(startDate));
  }, [startDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a name for the travel event");
      return;
    }

    // Validate dates
    if (endDate < startDate) {
      toast.error("End date must be after or equal to start date");
      return;
    }

    setIsSubmitting(true);
    try {
      await addTravelEvent({
        name: name.trim(),
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        color,
        location: location.trim() || undefined,
      });

      toast.success("Travel event created successfully");
      navigate(-1); // Go back to previous screen
    } catch (error: any) {
      console.error("[NewTravelEvent] Error creating travel event:", error);
      toast.error(error.message || "Failed to create travel event");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            New Travel Event
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create a new trip or travel event
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Event Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Trip to Paris, Business Conference"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              required
              autoFocus
            />
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <MapPin size={16} />
              Location (optional)
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Paris, France"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar size={16} />
                Start Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowStartDatePicker(!showStartDatePicker);
                    setShowEndDatePicker(false);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-left flex items-center justify-between"
                >
                  <span>{format(startDate, "MMM d, yyyy")}</span>
                  <Calendar size={18} className="text-gray-400" />
                </button>
                {showStartDatePicker && (
                  <div className="absolute z-10 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                    <DatePicker
                      selected={startDate}
                      onChange={(date: Date | null) => {
                        if (date) {
                          setStartDate(startOfDay(date));
                          // Auto-update end date if it's before new start date
                          if (endDate < date) {
                            setEndDate(startOfDay(date));
                          }
                          setShowStartDatePicker(false);
                        }
                      }}
                      inline
                      minDate={new Date()}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* End Date */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar size={16} />
                End Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowEndDatePicker(!showEndDatePicker);
                    setShowStartDatePicker(false);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-left flex items-center justify-between"
                >
                  <span>{format(endDate, "MMM d, yyyy")}</span>
                  <Calendar size={18} className="text-gray-400" />
                </button>
                {showEndDatePicker && (
                  <div className="absolute z-10 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                    <DatePicker
                      selected={endDate}
                      onChange={(date: Date | null) => {
                        if (date) {
                          setEndDate(startOfDay(date));
                          setShowEndDatePicker(false);
                        }
                      }}
                      inline
                      minDate={startDate}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Palette size={16} />
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {TRAVEL_EVENT_COLORS.map((colorOption) => (
                <button
                  key={colorOption}
                  type="button"
                  onClick={() => setColor(colorOption)}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${
                    color === colorOption
                      ? "border-gray-900 dark:border-white scale-110"
                      : "border-gray-300 dark:border-gray-600 hover:scale-105"
                  }`}
                  style={{ backgroundColor: colorOption }}
                  title={colorOption}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
              disabled={isSubmitting}
            >
              <X size={18} />
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Create Travel Event
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

