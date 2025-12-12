/**
 * Sync service for Travel Events
 * Problem 16: Travel Events (Trips)
 * Handles bidirectional sync with Supabase
 */

import { supabase } from './supabase';
import {
  loadTravelEventsFromCache,
  upsertTravelEventToCache,
  loadTravelEventsForDateRange,
} from '../database/travelEvents';
import type { TravelEvent } from '@mydailyops/core';

/**
 * Pull all travel events from Supabase
 * @param userId User ID
 * @returns Array of TravelEvent
 */
export async function pullTravelEventsFromSupabase(userId: string): Promise<TravelEvent[]> {
  console.log('[Sync TravelEvents] Pulling events for user:', userId);

  try {
    const { data, error } = await supabase
      .from('travel_events')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: true });

    if (error) {
      console.error('[Sync TravelEvents] Error fetching from Supabase:', error);
      throw error;
    }

    // Map Supabase rows to TravelEvent format
    const events: TravelEvent[] = (data || []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      start_date: row.start_date,
      end_date: row.end_date,
      color: row.color || '#3B82F6',
      location: row.location || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    console.log(`[Sync TravelEvents] Fetched ${events.length} events from Supabase`);

    // Save to local cache
    for (const event of events) {
      try {
        await upsertTravelEventToCache(event);
      } catch (cacheError) {
        console.warn('[Sync TravelEvents] Could not cache event:', cacheError);
      }
    }

    return events;
  } catch (error) {
    console.error('[Sync TravelEvents] Error pulling from Supabase:', error);
    throw error;
  }
}

/**
 * Push a single travel event to Supabase
 * @param event TravelEvent to push
 * @returns Updated TravelEvent from server
 */
export async function pushTravelEventToSupabase(event: TravelEvent): Promise<TravelEvent> {
  console.log('[Sync TravelEvents] Pushing event to Supabase:', event.id, event.name);

  try {
    const { data, error } = await supabase
      .from('travel_events')
      .upsert({
        id: event.id,
        user_id: event.user_id,
        name: event.name,
        start_date: event.start_date,
        end_date: event.end_date,
        color: event.color || '#3B82F6',
        location: event.location || null,
        created_at: event.created_at,
        updated_at: event.updated_at,
      }, {
        onConflict: 'id'
      })
      .select('*')
      .single();

    if (error) {
      console.error('[Sync TravelEvents] Supabase error:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from Supabase upsert');
    }

    const returnedEvent: TravelEvent = {
      id: data.id,
      user_id: data.user_id,
      name: data.name,
      start_date: data.start_date,
      end_date: data.end_date,
      color: data.color || '#3B82F6',
      location: data.location || undefined,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    // Update local cache with server response
    await upsertTravelEventToCache(returnedEvent);

    console.log('[Sync TravelEvents] Event pushed successfully:', event.id);
    return returnedEvent;
  } catch (error) {
    console.error('[Sync TravelEvents] Error pushing event to Supabase:', error);
    throw error;
  }
}

/**
 * Delete a travel event from Supabase
 * @param eventId Travel event ID
 * @param userId User ID (for security check)
 */
export async function deleteTravelEventFromSupabase(eventId: string, userId: string): Promise<void> {
  console.log('[Sync TravelEvents] Deleting event from Supabase:', eventId);

  try {
    const { error } = await supabase
      .from('travel_events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', userId);

    if (error) {
      console.error('[Sync TravelEvents] Supabase delete error:', error);
      throw error;
    }

    console.log('[Sync TravelEvents] Event deleted successfully:', eventId);
  } catch (error) {
    console.error('[Sync TravelEvents] Error deleting event from Supabase:', error);
    throw error;
  }
}

/**
 * Push all local travel events to Supabase
 * @param userId User ID
 */
export async function pushTravelEventsToSupabase(userId: string): Promise<void> {
  console.log('[Sync TravelEvents] Pushing local events to Supabase');

  try {
    const localEvents = await loadTravelEventsFromCache(userId);

    // Get all events from Supabase to compare
    const { data: supabaseEvents, error: fetchError } = await supabase
      .from('travel_events')
      .select('id, updated_at')
      .eq('user_id', userId);

    if (fetchError) throw fetchError;

    const supabaseEventMap = new Map<string, { updated_at: string }>();
    (supabaseEvents || []).forEach((event: any) => {
      supabaseEventMap.set(event.id, { updated_at: event.updated_at });
    });

    // Push new or updated events
    for (const localEvent of localEvents) {
      const supabaseEvent = supabaseEventMap.get(localEvent.id);

      if (!supabaseEvent) {
        // New event - push it
        console.log(`[Sync TravelEvents] Pushing new event: ${localEvent.name}`);
        await pushTravelEventToSupabase(localEvent);
      } else {
        // Existing event - check if local is newer
        const localUpdated = new Date(localEvent.updated_at);
        const serverUpdated = new Date(supabaseEvent.updated_at);

        if (localUpdated > serverUpdated) {
          // Local is newer - push it
          console.log(`[Sync TravelEvents] Pushing updated event: ${localEvent.name}`);
          await pushTravelEventToSupabase(localEvent);
        }
        // Else server is newer - will be handled by pull
      }
    }

    console.log('[Sync TravelEvents] Push complete');
  } catch (error) {
    console.error('[Sync TravelEvents] Error pushing to Supabase:', error);
    throw error;
  }
}

/**
 * Full sync for travel events: push local changes, then pull from Supabase
 * @param userId User ID
 * @returns Synced events
 */
export async function syncTravelEvents(userId: string): Promise<TravelEvent[]> {
  try {
    // 1. Push local changes first
    await pushTravelEventsToSupabase(userId);

    // 2. Pull from Supabase (gets latest server state)
    const events = await pullTravelEventsFromSupabase(userId);

    console.log('[Sync TravelEvents] Full sync completed, fetched', events.length, 'events');
    return events;
  } catch (error) {
    console.error('[Sync TravelEvents] Full sync failed:', error);
    throw error;
  }
}

