/**
 * Travel Event Store
 * Problem 16: Travel Events (Trips)
 * 
 * Zustand store for managing travel events in Desktop app
 */

import { create } from "zustand";
import type { TravelEvent } from "@mydailyops/core";
import { createTravelEvent } from "@mydailyops/core";
import * as dbTravelEvents from "../lib/dbTravelEvents";
import { getCurrentUserId } from "../lib/supabaseClient";
import {
  pushTravelEventToSupabase,
  deleteTravelEventFromSupabase,
  syncTravelEvents,
} from "../services/syncTravelEvents";
import {
  getPastTravelEvents,
  getFutureTravelEvents,
  getCurrentTravelEvents,
  getTravelEventsByYear,
} from "../lib/dbTravelEvents";

interface TravelEventState {
  travelEvents: TravelEvent[];
  isLoading: boolean;
  error: string | null;
  fetchTravelEvents: () => Promise<void>;
  addTravelEvent: (event: Omit<TravelEvent, "id" | "user_id" | "created_at" | "updated_at">) => Promise<void>;
  updateTravelEvent: (id: string, updates: Partial<TravelEvent>) => Promise<void>;
  deleteTravelEvent: (id: string) => Promise<void>;
  sync: () => Promise<void>;
  // History functions (Phase 8)
  getPastEvents: (today?: Date) => Promise<TravelEvent[]>;
  getFutureEvents: (today?: Date) => Promise<TravelEvent[]>;
  getCurrentEvents: (today?: Date) => Promise<TravelEvent[]>;
  getEventsByYear: (year: number) => Promise<TravelEvent[]>;
}

export const useTravelEventStore = create<TravelEventState>((set, get) => ({
  travelEvents: [],
  isLoading: false,
  error: null,

  fetchTravelEvents: async () => {
    set({ isLoading: true, error: null });
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        set({ travelEvents: [], isLoading: false });
        return;
      }

      // Load from local cache
      const events = await dbTravelEvents.loadTravelEventsFromCache(userId);
      set({ travelEvents: events, isLoading: false });
    } catch (error: any) {
      console.error("[TravelEventStore] Error fetching travel events:", error);
      set({ error: error.message || "Failed to fetch travel events", isLoading: false });
    }
  },

  addTravelEvent: async (eventData) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error("Not authenticated");
      }

      // Create travel event using core utility
      const newEvent = createTravelEvent({
        user_id: userId,
        name: eventData.name,
        start_date: eventData.start_date,
        end_date: eventData.end_date,
        color: eventData.color,
        location: eventData.location,
      });

      // Save to local cache
      await dbTravelEvents.upsertTravelEventToCache(newEvent);

      // Push to Supabase
      await pushTravelEventToSupabase(newEvent);

      // Refresh list
      await get().fetchTravelEvents();
    } catch (error: any) {
      console.error("[TravelEventStore] Error adding travel event:", error);
      throw error;
    }
  },

  updateTravelEvent: async (id, updates) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error("Not authenticated");
      }

      // Get current event
      const currentEvent = await dbTravelEvents.getTravelEventById(id, userId);
      if (!currentEvent) {
        throw new Error("Travel event not found or access denied");
      }

      const now = new Date().toISOString();
      const updatedEvent: TravelEvent = {
        ...currentEvent,
        ...updates,
        updated_at: now,
      };

      // Validate: end_date must be >= start_date
      if (updatedEvent.end_date < updatedEvent.start_date) {
        throw new Error("End date must be after or equal to start date");
      }

      // Save to local cache
      await dbTravelEvents.upsertTravelEventToCache(updatedEvent);

      // Push to Supabase
      await pushTravelEventToSupabase(updatedEvent);

      // Refresh list
      await get().fetchTravelEvents();
    } catch (error: any) {
      console.error("[TravelEventStore] Error updating travel event:", error);
      throw error;
    }
  },

  deleteTravelEvent: async (id) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error("Not authenticated");
      }

      // Verify event exists and belongs to user
      const event = await dbTravelEvents.getTravelEventById(id, userId);
      if (!event) {
        throw new Error("Travel event not found or access denied");
      }

      // Delete from local cache
      await dbTravelEvents.deleteTravelEventFromCache(id, userId);

      // Delete from Supabase
      await deleteTravelEventFromSupabase(id, userId);

      // Refresh list
      await get().fetchTravelEvents();
    } catch (error: any) {
      console.error("[TravelEventStore] Error deleting travel event:", error);
      throw error;
    }
  },

  sync: async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return;
      }

      // Sync with Supabase
      await syncTravelEvents(userId);

      // Refresh list
      await get().fetchTravelEvents();
    } catch (error: any) {
      console.error("[TravelEventStore] Error syncing travel events:", error);
      throw error;
    }
  },

  // History functions (Phase 8: History Storage)
  getPastEvents: async (today) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return [];
      }
      return await getPastTravelEvents(userId, today);
    } catch (error: any) {
      console.error("[TravelEventStore] Error getting past events:", error);
      throw error;
    }
  },

  getFutureEvents: async (today) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return [];
      }
      return await getFutureTravelEvents(userId, today);
    } catch (error: any) {
      console.error("[TravelEventStore] Error getting future events:", error);
      throw error;
    }
  },

  getCurrentEvents: async (today) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return [];
      }
      return await getCurrentTravelEvents(userId, today);
    } catch (error: any) {
      console.error("[TravelEventStore] Error getting current events:", error);
      throw error;
    }
  },

  getEventsByYear: async (year) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return [];
      }
      return await getTravelEventsByYear(userId, year);
    } catch (error: any) {
      console.error("[TravelEventStore] Error getting events by year:", error);
      throw error;
    }
  },
}));

