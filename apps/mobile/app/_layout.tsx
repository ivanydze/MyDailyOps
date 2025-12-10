import { useEffect, useState } from 'react';
import { Slot } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { lightTheme, darkTheme } from '../lib/theme';
import { initDatabase } from '../database/init';
import { useColorScheme, View, Image, StyleSheet, Dimensions } from 'react-native';
import { AuthProvider } from '../contexts/AuthContext';

/**
 * Root layout with providers including AuthProvider
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [dbReady, setDbReady] = useState(false);

  // Load Alice font
  const [fontsLoaded] = useFonts({
    'Alice': require('../assets/fonts/Alice-Regular.ttf'),
  });

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

  if (!dbReady || !fontsLoaded) {
    return null; // Wait for database and fonts to initialize
  }

  // Calculate watermark opacity based on theme (lighter in dark mode)
  // Increased opacity to make it more visible through screen backgrounds
  const watermarkOpacity = colorScheme === 'dark' ? 0.12 : 0.15;

  // Using logo.png for watermark
  const logoSource = require('../assets/logo.png');

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <SafeAreaProvider>
        <AuthProvider>
          <PaperProvider theme={theme}>
            <View style={{ flex: 1, backgroundColor: 'transparent' }}>
              {/* Subtle branded watermark background */}
              <Image
                source={logoSource}
                style={[
                  styles.watermark,
                  { opacity: watermarkOpacity }
                ]}
                resizeMode="cover"
              />
              <View style={{ flex: 1, backgroundColor: 'transparent', zIndex: 1 }}>
                <Slot />
              </View>
            </View>
          </PaperProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  watermark: {
    position: 'absolute',
    width: SCREEN_WIDTH * 1.5, // Increased to 150% of screen width for full coverage
    height: '100%', // Full screen height
    left: -SCREEN_WIDTH * 0.25, // Center horizontally (offset by half of extra width)
    top: 0, // Start from top
    zIndex: 0, // Below content to not block touches
    elevation: 0, // Android: ensure it's visible
    pointerEvents: 'none', // Allow touches to pass through watermark
  },
});

