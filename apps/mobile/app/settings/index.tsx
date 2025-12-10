import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Appbar, List, Switch, Button, useTheme, Divider, Dialog, Portal, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from '../../database/init';
import { useSync } from '../../hooks/useSync';
import { useAuth } from '../../contexts/AuthContext';
import { getTransparentBackground } from '../../lib/theme';

/**
 * Settings screen with full functionality
 */
export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { syncTasks, syncing } = useSync();
  const { logout } = useAuth();

  const [darkMode, setDarkMode] = useState(colorScheme === 'dark');
  const [clearCacheDialogVisible, setClearCacheDialogVisible] = useState(false);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);

  const handleDarkModeToggle = async () => {
    try {
      const newValue = !darkMode;
      setDarkMode(newValue);
      await AsyncStorage.setItem('theme', newValue ? 'dark' : 'light');
      Alert.alert('Theme Updated', 'Please restart the app to apply the new theme.');
    } catch (error) {
      console.error('[Settings] Error saving theme:', error);
      Alert.alert('Error', 'Failed to save theme preference');
    }
  };

  const handleSyncNow = async () => {
    try {
      await syncTasks();
      Alert.alert('Sync Complete', 'All tasks have been synchronized with the server.');
    } catch (error) {
      console.error('[Settings] Sync error:', error);
      Alert.alert('Sync Failed', 'Could not sync tasks. Please check your connection.');
    }
  };

  const handleClearCache = async () => {
    try {
      const db = getDatabase();
      await db.execAsync(`DELETE FROM tasks`);
      setClearCacheDialogVisible(false);
      Alert.alert('Cache Cleared', 'Local cache has been cleared. Pull to refresh to reload tasks.');
    } catch (error) {
      console.error('[Settings] Error clearing cache:', error);
      Alert.alert('Error', 'Failed to clear cache');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setLogoutDialogVisible(false);
      router.replace('/login');
    } catch (error) {
      console.error('[Settings] Logout error:', error);
      Alert.alert('Error', 'Failed to log out');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: getTransparentBackground(theme.dark) }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Settings" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <List.Section>
          <List.Subheader>Appearance</List.Subheader>
          <List.Item
            title="Dark Mode"
            description="Use dark theme"
            left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
            right={() => <Switch value={darkMode} onValueChange={handleDarkModeToggle} />}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Data & Sync</List.Subheader>
          <List.Item
            title="Sync Now"
            description={syncing ? 'Syncing...' : 'Sync tasks with server'}
            left={(props) => <List.Icon {...props} icon="sync" />}
            onPress={handleSyncNow}
            disabled={syncing}
          />
          <List.Item
            title="Clear Local Cache"
            description="Remove all cached tasks"
            left={(props) => <List.Icon {...props} icon="delete-sweep" />}
            onPress={() => setClearCacheDialogVisible(true)}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Account</List.Subheader>
          <List.Item
            title="Logout"
            description="Sign out of your account"
            left={(props) => <List.Icon {...props} icon="logout" />}
            onPress={() => setLogoutDialogVisible(true)}
          />
        </List.Section>

        <View style={styles.footer}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            MyDailyOps Mobile v1.0.0
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            Expo SDK 54 • Offline-First Architecture
          </Text>
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={clearCacheDialogVisible} onDismiss={() => setClearCacheDialogVisible(false)}>
          <Dialog.Title>Clear Cache</Dialog.Title>
          <Dialog.Content>
            <Text>
              This will delete all locally cached tasks and pending updates. 
              Make sure you've synced recently to avoid data loss.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setClearCacheDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleClearCache} textColor={theme.colors.error}>
              Clear
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={logoutDialogVisible} onDismiss={() => setLogoutDialogVisible(false)}>
          <Dialog.Title>Logout</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to log out?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLogoutDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleLogout}>Logout</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  footer: {
    marginTop: 48,
    paddingVertical: 24,
    gap: 4,
  },
});
