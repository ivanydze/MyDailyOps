import { useEffect, useState } from 'react';
import { Slot } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { lightTheme, darkTheme } from '../lib/theme';
import { initDatabase } from '../database/init';
import { useColorScheme } from 'react-native';
import { AuthProvider } from '../contexts/AuthContext';

/**
 * Root layout with providers including AuthProvider
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    console.log('[RootLayout] Initializing...');
    
    // Initialize database with new schema
    const initDB = async () => {
      try {
        await initDatabase();
        console.log('[RootLayout] Database ready');
        setDbReady(true);
      } catch (err) {
        console.error('[RootLayout] Failed to initialize database:', err);
        setDbReady(true); // Continue anyway
      }
    };
    
    initDB();
  }, []);

  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  if (!dbReady) {
    return null; // Wait for database to initialize
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <PaperProvider theme={theme}>
            <Slot />
          </PaperProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

