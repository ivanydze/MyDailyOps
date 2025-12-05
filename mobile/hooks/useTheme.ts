import { useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../lib/theme';
import type { MD3Theme } from 'react-native-paper';

const THEME_STORAGE_KEY = 'app_theme';

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface UseThemeReturn {
  theme: MD3Theme;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

/**
 * Hook for managing theme (light/dark mode)
 * Supports auto detection from device settings
 */
export function useTheme(): UseThemeReturn {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');

  /**
   * Load saved theme preference
   */
  useEffect(() => {
    loadThemePreference();
  }, []);

  /**
   * Update theme when system preference changes (in auto mode)
   */
  useEffect(() => {
    if (themeMode === 'auto') {
      setIsDark(systemColorScheme === 'dark');
    }
  }, [systemColorScheme, themeMode]);

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved) {
        const mode = saved as ThemeMode;
        setThemeModeState(mode);

        if (mode === 'auto') {
          setIsDark(systemColorScheme === 'dark');
        } else {
          setIsDark(mode === 'dark');
        }
      }
    } catch (err) {
      console.error('[useTheme] Error loading theme preference:', err);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);

      if (mode === 'auto') {
        setIsDark(systemColorScheme === 'dark');
      } else {
        setIsDark(mode === 'dark');
      }

      console.log(`[useTheme] Theme mode set to: ${mode}`);
    } catch (err) {
      console.error('[useTheme] Error saving theme preference:', err);
    }
  };

  return {
    theme: isDark ? darkTheme : lightTheme,
    themeMode,
    isDark,
    setThemeMode,
  };
}

