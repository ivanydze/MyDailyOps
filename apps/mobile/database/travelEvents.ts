/**
 * Database utilities for Travel Events (SQLite)
 * Problem 16: Travel Events (Trips)
 */

import * as SQLite from 'expo-sqlite';
import { getDatabase } from './init';
import type { TravelEvent } from '@mydailyops/core';

/**
 * Load all travel events for a user from local cache
 * @param userId User ID
 * @returns Array of TravelEvent
 */
export async function loadTravelEventsFromCache(userId: string): Promise<TravelEvent[]> {
  try {
    const db = getDatabase();
    const result = await db.getAllAsync<any>(
      "SELECT * FROM travel_events WHERE user_id = ? ORDER BY start_date ASC, created_at ASC",
      [userId]
    );

    return result.map(row => ({
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
  } catch (error) {
    console.error('[DB TravelEvents] Error loading travel events:', error);
    return [];
  }
}

/**
 * Load travel events for a specific date range
 * @param userId User ID
 * @param startDate Start date (YYYY-MM-DD format)
 * @param endDate End date (YYYY-MM-DD format)
 * @returns Array of TravelEvent that overlap with the date range
 */
export async function loadTravelEventsForDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<TravelEvent[]> {
  try {
    const db = getDatabase();
    
    // Find travel events that overlap with the date range
    // An event overlaps if: event.start_date <= query.end_date AND event.end_date >= query.start_date
    const result = await db.getAllAsync<any>(
      `SELECT * FROM travel_events 
       WHERE user_id = ? 
       AND start_date <= ? 
       AND end_date >= ?
       ORDER BY start_date ASC, created_at ASC`,
      [userId, endDate, startDate]
    );

    return result.map(row => ({
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
  } catch (error) {
    console.error('[DB TravelEvents] Error loading travel events for date range:', error);
    return [];
  }
}

/**
 * Load a single travel event by ID
 * @param eventId Travel event ID
 * @param userId User ID (for security check)
 * @returns TravelEvent or null if not found
 */
export async function getTravelEventById(eventId: string, userId: string): Promise<TravelEvent | null> {
  try {
    const db = getDatabase();
    const result = await db.getFirstAsync<any>(
      "SELECT * FROM travel_events WHERE id = ? AND user_id = ?",
      [eventId, userId]
    );

    if (!result) return null;

    return {
      id: result.id,
      user_id: result.user_id,
      name: result.name,
      start_date: result.start_date,
      end_date: result.end_date,
      color: result.color || '#3B82F6',
      location: result.location || undefined,
      created_at: result.created_at,
      updated_at: result.updated_at,
    };
  } catch (error) {
    console.error('[DB TravelEvents] Error loading travel event:', error);
    return null;
  }
}

/**
 * Save or update a travel event in local cache
 * @param event TravelEvent to save
 */
export async function upsertTravelEventToCache(event: TravelEvent): Promise<void> {
  try {
    const db = getDatabase();
    
    // Check if event exists
    const existing = await db.getFirstAsync<any>(
      "SELECT id FROM travel_events WHERE id = ?",
      [event.id]
    );

    if (existing) {
      // Update existing
      await db.runAsync(
        `UPDATE travel_events 
         SET name = ?, start_date = ?, end_date = ?, color = ?, location = ?, updated_at = ?
         WHERE id = ?`,
        [
          event.name,
          event.start_date,
          event.end_date,
          event.color || '#3B82F6',
          event.location || null,
          event.updated_at,
          event.id,
        ]
      );
    } else {
      // Insert new
      await db.runAsync(
        `INSERT INTO travel_events 
         (id, user_id, name, start_date, end_date, color, location, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          event.id,
          event.user_id,
          event.name,
          event.start_date,
          event.end_date,
          event.color || '#3B82F6',
          event.location || null,
          event.created_at,
          event.updated_at,
        ]
      );
    }
  } catch (error) {
    console.error('[DB TravelEvents] Error saving travel event:', error);
    throw error;
  }
}

/**
 * Delete a travel event from local cache
 * @param eventId Travel event ID
 * @param userId User ID (for security check)
 */
export async function deleteTravelEventFromCache(eventId: string, userId: string): Promise<void> {
  try {
    const db = getDatabase();
    await db.runAsync(
      "DELETE FROM travel_events WHERE id = ? AND user_id = ?",
      [eventId, userId]
    );
  } catch (error) {
    console.error('[DB TravelEvents] Error deleting travel event:', error);
    throw error;
  }
}

/**
 * Delete all travel events for a user (for cleanup)
 * @param userId User ID
 */
export async function clearAllTravelEventsData(userId: string): Promise<void> {
  try {
    const db = getDatabase();
    await db.runAsync(
      "DELETE FROM travel_events WHERE user_id = ?",
      [userId]
    );
  } catch (error) {
    console.error('[DB TravelEvents] Error clearing travel events:', error);
    throw error;
  }
}

/**
 * Get past travel events (events that have ended before today)
 * Problem 16 Phase 8: History Storage
 * @param userId User ID
 * @param today Optional date to compare against (defaults to today)
 * @returns Array of past TravelEvent objects
 */
export async function getPastTravelEvents(userId: string, today?: Date): Promise<TravelEvent[]> {
  try {
    const db = getDatabase();
    const todayStr = today 
      ? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      : new Date().toISOString().split('T')[0];

    const result = await db.getAllAsync<any>(
      `SELECT * FROM travel_events 
       WHERE user_id = ? 
       AND end_date < ?
       ORDER BY start_date DESC, created_at DESC`,
      [userId, todayStr]
    );

    return result.map(row => ({
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
  } catch (error) {
    console.error('[DB TravelEvents] Error loading past travel events:', error);
    return [];
  }
}

/**
 * Get future travel events (events that start after today)
 * Problem 16 Phase 8: History Storage
 * @param userId User ID
 * @param today Optional date to compare against (defaults to today)
 * @returns Array of future TravelEvent objects
 */
export async function getFutureTravelEvents(userId: string, today?: Date): Promise<TravelEvent[]> {
  try {
    const db = getDatabase();
    const todayStr = today 
      ? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      : new Date().toISOString().split('T')[0];

    const result = await db.getAllAsync<any>(
      `SELECT * FROM travel_events 
       WHERE user_id = ? 
       AND start_date > ?
       ORDER BY start_date ASC, created_at ASC`,
      [userId, todayStr]
    );

    return result.map(row => ({
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
  } catch (error) {
    console.error('[DB TravelEvents] Error loading future travel events:', error);
    return [];
  }
}

/**
 * Get current travel events (events that include today in their date range)
 * Problem 16 Phase 8: History Storage
 * @param userId User ID
 * @param today Optional date to compare against (defaults to today)
 * @returns Array of current TravelEvent objects
 */
export async function getCurrentTravelEvents(userId: string, today?: Date): Promise<TravelEvent[]> {
  try {
    const db = getDatabase();
    const todayStr = today 
      ? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      : new Date().toISOString().split('T')[0];

    const result = await db.getAllAsync<any>(
      `SELECT * FROM travel_events 
       WHERE user_id = ? 
       AND start_date <= ? 
       AND end_date >= ?
       ORDER BY start_date ASC, created_at ASC`,
      [userId, todayStr, todayStr]
    );

    return result.map(row => ({
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
  } catch (error) {
    console.error('[DB TravelEvents] Error loading current travel events:', error);
    return [];
  }
}

/**
 * Get travel events by year
 * Problem 16 Phase 8: History Storage
 * @param userId User ID
 * @param year Year to filter by (e.g., 2024)
 * @returns Array of TravelEvent objects for that year
 */
export async function getTravelEventsByYear(userId: string, year: number): Promise<TravelEvent[]> {
  try {
    const db = getDatabase();
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    const result = await db.getAllAsync<any>(
      `SELECT * FROM travel_events 
       WHERE user_id = ? 
       AND ((start_date >= ? AND start_date <= ?) 
            OR (end_date >= ? AND end_date <= ?)
            OR (start_date <= ? AND end_date >= ?))
       ORDER BY start_date ASC, created_at ASC`,
      [userId, yearStart, yearEnd, yearStart, yearEnd, yearStart, yearEnd]
    );

    return result.map(row => ({
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
  } catch (error) {
    console.error('[DB TravelEvents] Error loading travel events by year:', error);
    return [];
  }
}

