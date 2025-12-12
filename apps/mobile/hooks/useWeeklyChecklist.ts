/**
 * Weekly Checklist Hook
 * Problem 10: Always-Show Tasks → Weekly Checklists
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  loadCurrentWeekChecklistFromCache,
  loadWeeklyChecklistsFromCache,
  upsertWeeklyChecklistToCache,
} from '../database/weeklyChecklists';
import {
  createNewWeeklyChecklist,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  toggleChecklistItem,
  getChecklistStats,
} from '../utils/weeklyChecklist';
import { getCurrentWeekKey } from '../utils/week';
import type { WeeklyChecklist, ChecklistItem } from '../types/weeklyChecklist';

interface UseWeeklyChecklistReturn {
  currentChecklist: WeeklyChecklist | null;
  history: WeeklyChecklist[];
  isLoading: boolean;
  error: string | null;
  stats: {
    total_items: number;
    completed_items: number;
    completion_percentage: number;
  };

  // Actions
  loadCurrentWeekChecklist: () => Promise<void>;
  loadHistory: () => Promise<void>;
  addItem: (text: string) => Promise<void>;
  updateItem: (itemId: string, updates: Partial<Pick<ChecklistItem, 'text' | 'completed'>>) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  toggleItem: (itemId: string) => Promise<void>;
  updateTitle: (title: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const weekStartsOn: 0 | 1 = 0; // Default: Sunday

export function useWeeklyChecklist(): UseWeeklyChecklistReturn {
  const { user } = useAuth();
  const [currentChecklist, setCurrentChecklist] = useState<WeeklyChecklist | null>(null);
  const [history, setHistory] = useState<WeeklyChecklist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load current week's checklist (creates new if doesn't exist)
   */
  const loadCurrentWeekChecklist = useCallback(async () => {
    if (!user?.id) {
      setError('Not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const currentWeekKey = getCurrentWeekKey(weekStartsOn);

      // Try to load from cache
      let checklist = await loadCurrentWeekChecklistFromCache(user.id, currentWeekKey);

      // If not found, create new one
      if (!checklist) {
        console.log('[useWeeklyChecklist] Creating new checklist for week:', currentWeekKey);
        checklist = createNewWeeklyChecklist(user.id, weekStartsOn);
        
        // Save to cache immediately
        await upsertWeeklyChecklistToCache(checklist);
      }

      setCurrentChecklist(checklist);
    } catch (err: any) {
      console.error('[useWeeklyChecklist] Error loading checklist:', err);
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  /**
   * Load history of past checklists
   */
  const loadHistory = useCallback(async () => {
    if (!user?.id) return;

    try {
      const checklists = await loadWeeklyChecklistsFromCache(user.id, 50);
      
      // Filter out current week's checklist from history
      const currentWeekKey = getCurrentWeekKey(weekStartsOn);
      const filteredHistory = checklists.filter(
        (checklist) => checklist.week_start_date !== currentWeekKey
      );

      setHistory(filteredHistory);
    } catch (err: any) {
      console.error('[useWeeklyChecklist] Error loading history:', err);
    }
  }, [user?.id]);

  /**
   * Save checklist to cache and push to Supabase
   */
  const saveChecklist = useCallback(async (checklist: WeeklyChecklist) => {
    try {
      // Save to local cache first
      await upsertWeeklyChecklistToCache(checklist);
      console.log('[useWeeklyChecklist] Checklist saved locally:', checklist.id);
      
      // Push to Supabase in background (non-blocking)
      try {
        const { pushWeeklyChecklistToSupabase } = await import('../lib/syncWeeklyChecklists');
        await pushWeeklyChecklistToSupabase(checklist);
        console.log('[useWeeklyChecklist] Checklist synced to Supabase:', checklist.id);
      } catch (syncError) {
        console.warn('[useWeeklyChecklist] Error syncing checklist (non-critical):', syncError);
        // Don't throw - local save succeeded
      }
    } catch (err: any) {
      console.error('[useWeeklyChecklist] Error saving checklist:', err);
      setError(String(err));
    }
  }, []);

  /**
   * Add a new item to current checklist
   */
  const addItem = useCallback(async (text: string) => {
    if (!currentChecklist) {
      await loadCurrentWeekChecklist();
      const updated = currentChecklist;
      if (!updated) return;
    }

    const checklist = currentChecklist!;
    const updated = addChecklistItem(checklist, text);

    setCurrentChecklist(updated);
    await saveChecklist(updated);
  }, [currentChecklist, loadCurrentWeekChecklist, saveChecklist]);

  /**
   * Update an existing item
   */
  const updateItem = useCallback(async (
    itemId: string,
    updates: Partial<Pick<ChecklistItem, 'text' | 'completed'>>
  ) => {
    if (!currentChecklist) return;

    const updated = updateChecklistItem(currentChecklist, itemId, updates);
    setCurrentChecklist(updated);
    await saveChecklist(updated);
  }, [currentChecklist, saveChecklist]);

  /**
   * Delete an item
   */
  const deleteItem = useCallback(async (itemId: string) => {
    if (!currentChecklist) return;

    const updated = deleteChecklistItem(currentChecklist, itemId);
    setCurrentChecklist(updated);
    await saveChecklist(updated);
  }, [currentChecklist, saveChecklist]);

  /**
   * Toggle item completion
   */
  const toggleItem = useCallback(async (itemId: string) => {
    if (!currentChecklist) return;

    const updated = toggleChecklistItem(currentChecklist, itemId);
    setCurrentChecklist(updated);
    await saveChecklist(updated);
  }, [currentChecklist, saveChecklist]);

  /**
   * Update checklist title
   */
  const updateTitle = useCallback(async (title: string) => {
    if (!currentChecklist) {
      await loadCurrentWeekChecklist();
      const updated = currentChecklist;
      if (!updated) return;
    }

    const checklist = currentChecklist!;
    const updated: WeeklyChecklist = {
      ...checklist,
      title: title.trim() || undefined,
      updated_at: new Date().toISOString(),
    };

    setCurrentChecklist(updated);
    await saveChecklist(updated);
  }, [currentChecklist, loadCurrentWeekChecklist, saveChecklist]);

  /**
   * Refresh current checklist
   */
  const refresh = useCallback(async () => {
    await loadCurrentWeekChecklist();
  }, [loadCurrentWeekChecklist]);

  // Load checklist on mount
  useEffect(() => {
    if (user?.id) {
      loadCurrentWeekChecklist();
    }
  }, [user?.id, loadCurrentWeekChecklist]);

  // Calculate stats
  const stats = currentChecklist ? getChecklistStats(currentChecklist) : {
    total_items: 0,
    completed_items: 0,
    completion_percentage: 0,
  };

  return {
    currentChecklist,
    history,
    isLoading,
    error,
    stats,
    loadCurrentWeekChecklist,
    loadHistory,
    addItem,
    updateItem,
    deleteItem,
    toggleItem,
    updateTitle,
    refresh,
  };
}

