/**
 * Sync service for Weekly Checklists
 * Problem 10: Always-Show Tasks → Weekly Checklists
 * Handles bidirectional sync with Supabase
 */

import { supabase } from '../lib/supabaseClient';
import {
  loadWeeklyChecklistsFromCache,
  upsertWeeklyChecklistToCache,
} from '../lib/dbWeeklyChecklists';
import type { WeeklyChecklist, ChecklistItem } from '../types/weeklyChecklist';

/**
 * Pull all weekly checklists from Supabase
 * @param userId User ID
 * @returns Array of WeeklyChecklist
 */
export async function pullWeeklyChecklistsFromSupabase(userId: string): Promise<WeeklyChecklist[]> {
  console.log('[Sync WeeklyChecklists] Pulling checklists for user:', userId);

  try {
    const { data, error } = await supabase
      .from('weekly_checklists')
      .select('*')
      .eq('user_id', userId)
      .order('week_start_date', { ascending: false });

    if (error) {
      console.error('[Sync WeeklyChecklists] Error fetching from Supabase:', error);
      throw error;
    }

    // Map Supabase rows to WeeklyChecklist format
    const checklists: WeeklyChecklist[] = (data || []).map((row: any) => {
      let items: ChecklistItem[] = [];
      
      if (row.items) {
        try {
          items = typeof row.items === 'string'
            ? JSON.parse(row.items)
            : row.items;
        } catch (e) {
          console.error('[Sync WeeklyChecklists] Error parsing items JSON:', e);
          items = [];
        }
      }

      return {
        id: row.id,
        user_id: row.user_id,
        week_start_date: row.week_start_date,
        week_end_date: row.week_end_date,
        title: row.title || undefined,
        items: items,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    console.log(`[Sync WeeklyChecklists] Fetched ${checklists.length} checklists from Supabase`);

    // Save to local cache
    for (const checklist of checklists) {
      try {
        await upsertWeeklyChecklistToCache(checklist);
      } catch (cacheError) {
        console.warn('[Sync WeeklyChecklists] Could not cache checklist (browser mode?):', cacheError);
      }
    }

    return checklists;
  } catch (error) {
    console.error('[Sync WeeklyChecklists] Error pulling from Supabase:', error);
    throw error;
  }
}

/**
 * Push a single weekly checklist to Supabase
 * @param checklist WeeklyChecklist to push
 * @returns Updated WeeklyChecklist from server
 */
export async function pushWeeklyChecklistToSupabase(checklist: WeeklyChecklist): Promise<WeeklyChecklist> {
  console.log('[Sync WeeklyChecklists] Pushing checklist to Supabase:', checklist.id, checklist.week_start_date);

  try {
    const itemsJson = JSON.stringify(checklist.items);

    const { data, error } = await supabase
      .from('weekly_checklists')
      .upsert({
        id: checklist.id,
        user_id: checklist.user_id,
        week_start_date: checklist.week_start_date,
        week_end_date: checklist.week_end_date,
        title: checklist.title || null,
        items: itemsJson,
        created_at: checklist.created_at,
        updated_at: checklist.updated_at,
      }, {
        onConflict: 'user_id,week_start_date'
      })
      .select('*')
      .single();

    if (error) {
      console.error('[Sync WeeklyChecklists] Supabase error:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from Supabase upsert');
    }

    // Parse items from response
    let items: ChecklistItem[] = [];
    if (data.items) {
      try {
        items = typeof data.items === 'string'
          ? JSON.parse(data.items)
          : data.items;
      } catch (e) {
        console.error('[Sync WeeklyChecklists] Error parsing items from response:', e);
        items = [];
      }
    }

    const returnedChecklist: WeeklyChecklist = {
      id: data.id,
      user_id: data.user_id,
      week_start_date: data.week_start_date,
      week_end_date: data.week_end_date,
      title: data.title || undefined,
      items: items,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    // Update local cache with server response
    await upsertWeeklyChecklistToCache(returnedChecklist);

    console.log('[Sync WeeklyChecklists] Checklist pushed successfully:', checklist.id);
    return returnedChecklist;
  } catch (error) {
    console.error('[Sync WeeklyChecklists] Error pushing checklist to Supabase:', error);
    throw error;
  }
}

/**
 * Push all local weekly checklists to Supabase
 * @param userId User ID
 */
export async function pushWeeklyChecklistsToSupabase(userId: string): Promise<void> {
  console.log('[Sync WeeklyChecklists] Pushing local checklists to Supabase');

  try {
    const localChecklists = await loadWeeklyChecklistsFromCache(userId, 100); // Get more to push all

    // Get all checklists from Supabase to compare
    const { data: supabaseChecklists, error: fetchError } = await supabase
      .from('weekly_checklists')
      .select('id, week_start_date, updated_at')
      .eq('user_id', userId);

    if (fetchError) throw fetchError;

    const supabaseChecklistMap = new Map<string, { updated_at: string }>();
    (supabaseChecklists || []).forEach((checklist: any) => {
      const key = `${checklist.week_start_date}`;
      supabaseChecklistMap.set(key, { updated_at: checklist.updated_at });
    });

    // Push new or updated checklists
    for (const localChecklist of localChecklists) {
      const key = localChecklist.week_start_date;
      const supabaseChecklist = supabaseChecklistMap.get(key);

      if (!supabaseChecklist) {
        // New checklist - push it
        console.log(`[Sync WeeklyChecklists] Pushing new checklist: ${localChecklist.week_start_date}`);
        await pushWeeklyChecklistToSupabase(localChecklist);
      } else {
        // Existing checklist - check if local is newer
        const localUpdated = new Date(localChecklist.updated_at);
        const serverUpdated = new Date(supabaseChecklist.updated_at);

        if (localUpdated > serverUpdated) {
          // Local is newer - push it
          console.log(`[Sync WeeklyChecklists] Pushing updated checklist: ${localChecklist.week_start_date}`);
          await pushWeeklyChecklistToSupabase(localChecklist);
        }
        // Else server is newer - will be handled by pull
      }
    }

    console.log('[Sync WeeklyChecklists] Push complete');
  } catch (error) {
    console.error('[Sync WeeklyChecklists] Error pushing to Supabase:', error);
    throw error;
  }
}

/**
 * Full sync for weekly checklists: push local changes, then pull from Supabase
 * @param userId User ID
 * @returns Synced checklists
 */
export async function syncWeeklyChecklists(userId: string): Promise<WeeklyChecklist[]> {
  try {
    // 1. Push local changes first
    await pushWeeklyChecklistsToSupabase(userId);

    // 2. Pull from Supabase (gets latest server state)
    const checklists = await pullWeeklyChecklistsFromSupabase(userId);

    console.log('[Sync WeeklyChecklists] Full sync completed, fetched', checklists.length, 'checklists');
    return checklists;
  } catch (error) {
    console.error('[Sync WeeklyChecklists] Full sync failed:', error);
    throw error;
  }
}

