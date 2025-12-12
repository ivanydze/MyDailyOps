import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { WeekendFilterSettings } from '../utils/weekend';

interface SettingsState {
  weekendFilter: WeekendFilterSettings;
  setWeekendFilter: (settings: Partial<WeekendFilterSettings>) => void;
  toggleWeekendVisibility: () => void;
  toggleCategoryOnWeekends: (category: string) => void;
  togglePriorityOnWeekends: (priority: 'low' | 'medium') => void;
}

const defaultWeekendFilter: WeekendFilterSettings = {
  showTasksOnWeekends: true,
  hiddenCategoriesOnWeekends: [],
  hiddenPrioritiesOnWeekends: [],
};

const SETTINGS_STORAGE_KEY = 'mydailyops-settings';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      weekendFilter: defaultWeekendFilter,
      
      setWeekendFilter: (settings) =>
        set((state) => ({
          weekendFilter: { ...state.weekendFilter, ...settings },
        })),
      
      toggleWeekendVisibility: () =>
        set((state) => ({
          weekendFilter: {
            ...state.weekendFilter,
            showTasksOnWeekends: !state.weekendFilter.showTasksOnWeekends,
          },
        })),
      
      toggleCategoryOnWeekends: (category) =>
        set((state) => {
          const { hiddenCategoriesOnWeekends } = state.weekendFilter;
          const isHidden = hiddenCategoriesOnWeekends.includes(category);
          
          return {
            weekendFilter: {
              ...state.weekendFilter,
              hiddenCategoriesOnWeekends: isHidden
                ? hiddenCategoriesOnWeekends.filter((c) => c !== category)
                : [...hiddenCategoriesOnWeekends, category],
            },
          };
        }),
      
      togglePriorityOnWeekends: (priority) =>
        set((state) => {
          const { hiddenPrioritiesOnWeekends } = state.weekendFilter;
          const isHidden = hiddenPrioritiesOnWeekends.includes(priority);
          
          return {
            weekendFilter: {
              ...state.weekendFilter,
              hiddenPrioritiesOnWeekends: isHidden
                ? hiddenPrioritiesOnWeekends.filter((p) => p !== priority)
                : [...hiddenPrioritiesOnWeekends, priority],
            },
          };
        }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist weekend filter settings
      partialize: (state) => ({
        weekendFilter: state.weekendFilter,
      }),
    }
  )
);

