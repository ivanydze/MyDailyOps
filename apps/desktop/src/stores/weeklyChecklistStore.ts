/**
 * Weekly Checklist Store (Zustand)
 * Problem 10: Always-Show Tasks → Weekly Checklists
 */

import { create } from "zustand";
import { getCurrentUserId } from "../lib/supabaseClient";
import {
  loadCurrentWeekChecklistFromCache,
  loadWeeklyChecklistsFromCache,
  upsertWeeklyChecklistToCache,
} from "../lib/dbWeeklyChecklists";
import {
  createNewWeeklyChecklist,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  toggleChecklistItem,
} from "../utils/weeklyChecklist";
import { getCurrentWeekKey } from "../utils/week";
import type { WeeklyChecklist, ChecklistItem } from "../types/weeklyChecklist";

interface WeeklyChecklistState {
  currentChecklist: WeeklyChecklist | null;
  history: WeeklyChecklist[];
  isLoading: boolean;
  error: string | null;
  weekStartsOn: 0 | 1; // 0 = Sunday, 1 = Monday

  // Actions
  loadCurrentWeekChecklist: () => Promise<void>;
  loadHistory: () => Promise<void>;
  addItem: (text: string) => Promise<void>;
  updateItem: (itemId: string, updates: Partial<Pick<ChecklistItem, 'text' | 'completed'>>) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  toggleItem: (itemId: string) => Promise<void>;
  updateTitle: (title: string) => Promise<void>;
  saveChecklist: (checklist: WeeklyChecklist) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useWeeklyChecklistStore = create<WeeklyChecklistState>((set, get) => ({
  currentChecklist: null,
  history: [],
  isLoading: false,
  error: null,
  weekStartsOn: 0, // Default: Sunday

  /**
   * Load current week's checklist (creates new if doesn't exist)
   */
  loadCurrentWeekChecklist: async () => {
    set({ isLoading: true, error: null });

    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        set({ isLoading: false, error: "Not authenticated" });
        return;
      }

      const weekStartsOn = get().weekStartsOn;
      const currentWeekKey = getCurrentWeekKey(weekStartsOn);

      // Try to load from cache
      let checklist = await loadCurrentWeekChecklistFromCache(userId, currentWeekKey);

      // If not found, create new one
      if (!checklist) {
        console.log('[WeeklyChecklistStore] Creating new checklist for week:', currentWeekKey);
        checklist = createNewWeeklyChecklist(userId, weekStartsOn);
        
        // Save to cache immediately
        await upsertWeeklyChecklistToCache(checklist);
      }

      set({ currentChecklist: checklist, isLoading: false });
    } catch (error: any) {
      console.error('[WeeklyChecklistStore] Error loading checklist:', error);
      set({ error: String(error), isLoading: false });
    }
  },

  /**
   * Load history of past checklists
   */
  loadHistory: async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return;
      }

      const checklists = await loadWeeklyChecklistsFromCache(userId, 50);
      
      // Filter out current week's checklist from history
      const currentWeekKey = getCurrentWeekKey(get().weekStartsOn);
      const history = checklists.filter(
        (checklist) => checklist.week_start_date !== currentWeekKey
      );

      set({ history });
    } catch (error: any) {
      console.error('[WeeklyChecklistStore] Error loading history:', error);
    }
  },

  /**
   * Add a new item to current checklist
   */
  addItem: async (text: string) => {
    const { currentChecklist } = get();
    if (!currentChecklist) {
      console.warn('[WeeklyChecklistStore] No current checklist, loading first...');
      await get().loadCurrentWeekChecklist();
      const updated = get().currentChecklist;
      if (!updated) return;
    }

    const checklist = currentChecklist || get().currentChecklist!;
    const updated = addChecklistItem(checklist, text);

    set({ currentChecklist: updated });
    await get().saveChecklist(updated);
  },

  /**
   * Update an existing item
   */
  updateItem: async (itemId: string, updates: Partial<Pick<ChecklistItem, 'text' | 'completed'>>) => {
    const { currentChecklist } = get();
    if (!currentChecklist) return;

    const updated = updateChecklistItem(currentChecklist, itemId, updates);
    set({ currentChecklist: updated });
    await get().saveChecklist(updated);
  },

  /**
   * Delete an item
   */
  deleteItem: async (itemId: string) => {
    const { currentChecklist } = get();
    if (!currentChecklist) return;

    const updated = deleteChecklistItem(currentChecklist, itemId);
    set({ currentChecklist: updated });
    await get().saveChecklist(updated);
  },

  /**
   * Toggle item completion
   */
  toggleItem: async (itemId: string) => {
    const { currentChecklist } = get();
    if (!currentChecklist) return;

    const updated = toggleChecklistItem(currentChecklist, itemId);
    set({ currentChecklist: updated });
    await get().saveChecklist(updated);
  },

  /**
   * Update checklist title
   */
  updateTitle: async (title: string) => {
    const { currentChecklist } = get();
    if (!currentChecklist) {
      await get().loadCurrentWeekChecklist();
      const updated = get().currentChecklist;
      if (!updated) return;
    }

    const checklist = currentChecklist || get().currentChecklist!;
    const updated: WeeklyChecklist = {
      ...checklist,
      title: title.trim() || undefined,
      updated_at: new Date().toISOString(),
    };

    set({ currentChecklist: updated });
    await get().saveChecklist(updated);
  },

  /**
   * Save checklist to cache and push to Supabase
   */
  saveChecklist: async (checklist: WeeklyChecklist) => {
    try {
      // Save to local cache first
      await upsertWeeklyChecklistToCache(checklist);
      console.log('[WeeklyChecklistStore] Checklist saved locally:', checklist.id);
      
      // Push to Supabase in background (non-blocking)
      try {
        const { pushWeeklyChecklistToSupabase } = await import('../services/syncWeeklyChecklists');
        await pushWeeklyChecklistToSupabase(checklist);
        console.log('[WeeklyChecklistStore] Checklist synced to Supabase:', checklist.id);
      } catch (syncError) {
        console.warn('[WeeklyChecklistStore] Error syncing checklist (non-critical):', syncError);
        // Don't throw - local save succeeded
      }
    } catch (error: any) {
      console.error('[WeeklyChecklistStore] Error saving checklist:', error);
      set({ error: String(error) });
    }
  },

  /**
   * Refresh current checklist
   */
  refresh: async () => {
    await get().loadCurrentWeekChecklist();
  },
}));

