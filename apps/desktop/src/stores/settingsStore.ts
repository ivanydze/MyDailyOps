import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getCurrentTimezone } from '../utils/timezone';

export interface WeekendFilterSettings {
  showTasksOnWeekends: boolean;
  hiddenCategoriesOnWeekends: string[];
  hiddenPrioritiesOnWeekends: ('low' | 'medium')[];
}

interface SettingsState {
  weekendFilter: WeekendFilterSettings;
  defaultTimezone: string; // IANA timezone identifier (Problem 17)
  setWeekendFilter: (settings: Partial<WeekendFilterSettings>) => void;
  toggleWeekendVisibility: () => void;
  toggleCategoryOnWeekends: (category: string) => void;
  togglePriorityOnWeekends: (priority: 'low' | 'medium') => void;
  setDefaultTimezone: (timezone: string) => void;
}

const defaultWeekendFilter: WeekendFilterSettings = {
  showTasksOnWeekends: true,
  hiddenCategoriesOnWeekends: [],
  hiddenPrioritiesOnWeekends: [],
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      weekendFilter: defaultWeekendFilter,
      defaultTimezone: getCurrentTimezone(), // Initialize with current timezone (Problem 17)
      
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
      
      setDefaultTimezone: (timezone: string) =>
        set({ defaultTimezone: timezone }),
    }),
    {
      name: 'mydailyops-settings',
      // Persist both weekend filter and default timezone settings
      partialize: (state) => ({
        weekendFilter: state.weekendFilter,
        defaultTimezone: state.defaultTimezone,
      }),
    }
  )
);

