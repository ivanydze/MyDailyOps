import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

/**
 * Configure fonts to use Alice as the default font family
 */
const fontConfig = {
  web: {
    regular: {
      fontFamily: 'Alice, system-ui, sans-serif',
      fontWeight: '400' as const,
    },
    medium: {
      fontFamily: 'Alice, system-ui, sans-serif',
      fontWeight: '500' as const,
    },
    light: {
      fontFamily: 'Alice, system-ui, sans-serif',
      fontWeight: '300' as const,
    },
    thin: {
      fontFamily: 'Alice, system-ui, sans-serif',
      fontWeight: '100' as const,
    },
  },
  ios: {
    regular: {
      fontFamily: 'Alice',
      fontWeight: '400' as const,
    },
    medium: {
      fontFamily: 'Alice',
      fontWeight: '500' as const,
    },
    light: {
      fontFamily: 'Alice',
      fontWeight: '300' as const,
    },
    thin: {
      fontFamily: 'Alice',
      fontWeight: '100' as const,
    },
  },
  android: {
    regular: {
      fontFamily: 'Alice',
      fontWeight: '400' as const,
    },
    medium: {
      fontFamily: 'Alice',
      fontWeight: '500' as const,
    },
    light: {
      fontFamily: 'Alice',
      fontWeight: '300' as const,
    },
    thin: {
      fontFamily: 'Alice',
      fontWeight: '100' as const,
    },
  },
};

const fonts = configureFonts({ config: fontConfig });

/**
 * Material 3 Light Theme
 */
export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  fonts,
  colors: {
    ...MD3LightTheme.colors,
    primary: 'rgb(103, 80, 164)',
    onPrimary: 'rgb(255, 255, 255)',
    primaryContainer: 'rgb(234, 221, 255)',
    onPrimaryContainer: 'rgb(33, 0, 94)',
    secondary: 'rgb(98, 91, 113)',
    onSecondary: 'rgb(255, 255, 255)',
    secondaryContainer: 'rgb(232, 222, 248)',
    onSecondaryContainer: 'rgb(30, 25, 43)',
    tertiary: 'rgb(125, 82, 96)',
    onTertiary: 'rgb(255, 255, 255)',
    tertiaryContainer: 'rgb(255, 217, 227)',
    onTertiaryContainer: 'rgb(55, 11, 30)',
    error: 'rgb(186, 26, 26)',
    onError: 'rgb(255, 255, 255)',
    errorContainer: 'rgb(255, 218, 214)',
    onErrorContainer: 'rgb(65, 0, 2)',
    background: 'rgba(255, 251, 255, 0.88)', // More transparent to show watermark
    onBackground: 'rgb(29, 27, 32)',
    surface: 'rgba(255, 251, 255, 0.92)', // Slightly transparent to show watermark
    onSurface: 'rgb(29, 27, 32)',
    surfaceVariant: 'rgb(231, 224, 236)',
    onSurfaceVariant: 'rgb(73, 69, 79)',
    outline: 'rgb(121, 116, 126)',
    outlineVariant: 'rgb(202, 196, 208)',
    shadow: 'rgb(0, 0, 0)',
    scrim: 'rgb(0, 0, 0)',
    inverseSurface: 'rgb(50, 47, 53)',
    inverseOnSurface: 'rgb(245, 239, 247)',
    inversePrimary: 'rgb(208, 188, 255)',
    elevation: {
      level0: 'transparent',
      level1: 'rgb(248, 242, 251)',
      level2: 'rgb(244, 236, 248)',
      level3: 'rgb(240, 231, 246)',
      level4: 'rgb(239, 229, 245)',
      level5: 'rgb(236, 226, 243)',
    },
    surfaceDisabled: 'rgba(29, 27, 32, 0.12)',
    onSurfaceDisabled: 'rgba(29, 27, 32, 0.38)',
    backdrop: 'rgba(50, 47, 55, 0.4)',
  },
};

/**
 * Material 3 Dark Theme
 */
export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  fonts,
  colors: {
    ...MD3DarkTheme.colors,
    primary: 'rgb(208, 188, 255)',
    onPrimary: 'rgb(55, 30, 115)',
    primaryContainer: 'rgb(79, 55, 139)',
    onPrimaryContainer: 'rgb(234, 221, 255)',
    secondary: 'rgb(204, 194, 220)',
    onSecondary: 'rgb(51, 45, 65)',
    secondaryContainer: 'rgb(74, 68, 88)',
    onSecondaryContainer: 'rgb(232, 222, 248)',
    tertiary: 'rgb(239, 184, 200)',
    onTertiary: 'rgb(73, 37, 50)',
    tertiaryContainer: 'rgb(99, 59, 72)',
    onTertiaryContainer: 'rgb(255, 217, 227)',
    error: 'rgb(255, 180, 171)',
    onError: 'rgb(105, 0, 5)',
    errorContainer: 'rgb(147, 0, 10)',
    onErrorContainer: 'rgb(255, 218, 214)',
    background: 'rgba(29, 27, 32, 0.88)', // More transparent to show watermark
    onBackground: 'rgb(231, 225, 229)',
    surface: 'rgba(29, 27, 32, 0.92)', // Slightly transparent to show watermark
    onSurface: 'rgb(231, 225, 229)',
    surfaceVariant: 'rgb(73, 69, 79)',
    onSurfaceVariant: 'rgb(202, 196, 208)',
    outline: 'rgb(147, 143, 153)',
    outlineVariant: 'rgb(73, 69, 79)',
    shadow: 'rgb(0, 0, 0)',
    scrim: 'rgb(0, 0, 0)',
    inverseSurface: 'rgb(231, 225, 229)',
    inverseOnSurface: 'rgb(50, 47, 53)',
    inversePrimary: 'rgb(103, 80, 164)',
    elevation: {
      level0: 'transparent',
      level1: 'rgb(39, 35, 41)',
      level2: 'rgb(44, 40, 48)',
      level3: 'rgb(49, 44, 56)',
      level4: 'rgb(51, 46, 58)',
      level5: 'rgb(54, 49, 63)',
    },
    surfaceDisabled: 'rgba(231, 225, 229, 0.12)',
    onSurfaceDisabled: 'rgba(231, 225, 229, 0.38)',
    backdrop: 'rgba(50, 47, 55, 0.4)',
  },
};

/**
 * Priority colors for task badges
 */
export const priorityColors = {
  light: {
    high: '#D32F2F',
    medium: '#F57C00',
    low: '#388E3C',
  },
  dark: {
    high: '#EF5350',
    medium: '#FF9800',
    low: '#66BB6A',
  },
};

/**
 * Status colors for task indicators
 */
export const statusColors = {
  light: {
    pending: '#757575',
    in_progress: '#1976D2',
    done: '#388E3C',
  },
  dark: {
    pending: '#BDBDBD',
    in_progress: '#42A5F5',
    done: '#66BB6A',
  },
};

/**
 * Get transparent background color for screens to show watermark
 * Accepts either colorScheme string or theme.dark boolean
 */
export function getTransparentBackground(colorScheme?: 'light' | 'dark' | null | undefined | boolean): string {
  const isDark = typeof colorScheme === 'boolean' ? colorScheme : colorScheme === 'dark';
  if (isDark) {
    return 'rgba(29, 27, 32, 0.90)'; // 90% opacity - better balance
  }
  return 'rgba(255, 251, 255, 0.92)'; // 92% opacity - better balance
}

/**
 * Get transparent surface color for cards to show watermark behind them
 * Accepts either colorScheme string or theme.dark boolean
 */
export function getTransparentSurface(colorScheme?: 'light' | 'dark' | null | undefined | boolean): string {
  const isDark = typeof colorScheme === 'boolean' ? colorScheme : colorScheme === 'dark';
  if (isDark) {
    return 'rgba(29, 27, 32, 0.93)'; // 93% opacity - better readability while showing watermark
  }
  return 'rgba(255, 251, 255, 0.95)'; // 95% opacity - better readability while showing watermark
}

/**
 * Get transparent primary container color for buttons/badges to show watermark behind them
 * Accepts either colorScheme string or theme.dark boolean
 */
export function getTransparentPrimaryContainer(colorScheme?: 'light' | 'dark' | null | undefined | boolean): string {
  const isDark = typeof colorScheme === 'boolean' ? colorScheme : colorScheme === 'dark';
  if (isDark) {
    return 'rgba(79, 55, 139, 0.90)'; // Primary container color with transparency for dark mode
  }
  return 'rgba(234, 221, 255, 0.90)'; // Primary container color with transparency for light mode
}

