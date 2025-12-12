import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Appbar, List, Switch, Button, useTheme, Divider, Dialog, Portal, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from '../../database/init';
import { useSync } from '../../hooks/useSync';
import { useAuth } from '../../contexts/AuthContext';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTransparentBackground } from '../../lib/theme';
import { useMemo } from 'react';
import DeleteAllConfirmation from '../../components/DeleteAllConfirmation';
import * as dbTrash from '../../database/dbTrash';
import { checkForUpdates, installUpdate, getCurrentUpdateId, isRunningOnUpdate } from '../../services/updateService';
import Constants from 'expo-constants';

/**
 * Settings screen with full functionality
 */
export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { syncTasks, syncing, tasks } = useSync();
  const { logout, user } = useAuth();
  const userId = user?.id;
  const weekendFilter = useSettingsStore((state) => state.weekendFilter);
  const toggleWeekendVisibility = useSettingsStore((state) => state.toggleWeekendVisibility);
  const toggleCategoryOnWeekends = useSettingsStore((state) => state.toggleCategoryOnWeekends);
  const togglePriorityOnWeekends = useSettingsStore((state) => state.togglePriorityOnWeekends);

  // Get all unique categories from tasks
  const allCategories = useMemo(() => {
    const categories = new Set<string>();
    tasks.forEach((task) => {
      if (task.category) {
        categories.add(task.category);
      }
    });
    return Array.from(categories).sort();
  }, [tasks]);

  const [darkMode, setDarkMode] = useState(colorScheme === 'dark');
  const [clearCacheDialogVisible, setClearCacheDialogVisible] = useState(false);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDeleteAllConfirmation, setShowDeleteAllConfirmation] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

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

  const handleDeleteAll = async () => {
    if (!userId) return;
    
    try {
      const count = await dbTrash.softDeleteAllTasks(userId);
      await refreshTasks(); // Refresh to update task list
      await syncTasks(); // Sync to Supabase
      setShowDeleteAllConfirmation(false);
      Alert.alert(
        'Tasks Moved to Trash',
        `Moved ${count} task${count !== 1 ? 's' : ''} to Trash. You can restore them from Trash within 30 days.`
      );
    } catch (error: any) {
      console.error('[Settings] Delete all error:', error);
      Alert.alert('Error', error.message || 'Failed to delete tasks');
    }
  };

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdates(true);
    try {
      const available = await checkForUpdates();
      setUpdateAvailable(available);
      if (available) {
        Alert.alert(
          'Update Available',
          'A new version is available. Would you like to install it now?',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Install Now',
              onPress: handleInstallUpdate,
            },
          ]
        );
      } else {
        Alert.alert('Up to Date', 'You are using the latest version.');
      }
    } catch (error: any) {
      console.error('[Settings] Error checking updates:', error);
      Alert.alert('Error', 'Failed to check for updates. Make sure you are using a production build.');
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const handleInstallUpdate = async () => {
    setIsInstallingUpdate(true);
    try {
      await installUpdate();
      // App will reload automatically
      Alert.alert('Update Installed', 'The app will restart to apply the update.');
    } catch (error: any) {
      console.error('[Settings] Error installing update:', error);
      Alert.alert('Error', 'Failed to install update. Please try again.');
      setIsInstallingUpdate(false);
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
          <List.Subheader>Task Visibility</List.Subheader>
          <List.Item
            title="Show tasks on weekends"
            description="Control which tasks appear on weekends"
            left={(props) => <List.Icon {...props} icon="calendar-weekend" />}
            right={() => (
              <Switch 
                value={weekendFilter.showTasksOnWeekends} 
                onValueChange={toggleWeekendVisibility} 
              />
            )}
          />
          {!weekendFilter.showTasksOnWeekends && (
            <>
              <List.Item
                title="Hide categories on weekends"
                description={
                  weekendFilter.hiddenCategoriesOnWeekends.length > 0
                    ? `${weekendFilter.hiddenCategoriesOnWeekends.length} category(ies) hidden`
                    : 'Tap to select categories to hide'
                }
                left={(props) => <List.Icon {...props} icon="tag-off" />}
                onPress={() => {
                  // For now, show a simple picker
                  // In a full implementation, this would open a modal with checkboxes
                  Alert.alert(
                    'Hide Categories',
                    allCategories.length === 0
                      ? 'No categories found in your tasks.'
                      : `Select categories to hide:\n\n${allCategories.map(cat => {
                          const isHidden = weekendFilter.hiddenCategoriesOnWeekends.includes(cat);
                          return `${isHidden ? '✓' : '○'} ${cat}`;
                        }).join('\n')}\n\nNote: Full category selector coming soon.`,
                    [
                      { text: 'OK' },
                      ...(allCategories.map(cat => ({
                        text: `${weekendFilter.hiddenCategoriesOnWeekends.includes(cat) ? 'Show' : 'Hide'} ${cat}`,
                        onPress: () => toggleCategoryOnWeekends(cat),
                      }))),
                    ]
                  );
                }}
              />
              <List.Item
                title="Hide priorities on weekends"
                description={
                  weekendFilter.hiddenPrioritiesOnWeekends.length > 0
                    ? `${weekendFilter.hiddenPrioritiesOnWeekends.length} priority(ies) hidden`
                    : 'Tap to select priorities to hide'
                }
                left={(props) => <List.Icon {...props} icon="flag-outline" />}
                onPress={() => {
                  Alert.alert(
                    'Hide Priorities',
                    'Select priorities to hide on weekends (high priority always visible):',
                    [
                      { text: 'OK' },
                      {
                        text: weekendFilter.hiddenPrioritiesOnWeekends.includes('low')
                          ? 'Show Low Priority'
                          : 'Hide Low Priority',
                        onPress: () => togglePriorityOnWeekends('low'),
                      },
                      {
                        text: weekendFilter.hiddenPrioritiesOnWeekends.includes('medium')
                          ? 'Show Medium Priority'
                          : 'Hide Medium Priority',
                        onPress: () => togglePriorityOnWeekends('medium'),
                      },
                    ]
                  );
                }}
              />
            </>
          )}
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
          <List.Subheader>App Updates</List.Subheader>
          <List.Item
            title="Check for Updates"
            description={isCheckingUpdates ? 'Checking...' : 'Check for app updates'}
            left={(props) => <List.Icon {...props} icon="cloud-download" />}
            onPress={handleCheckForUpdates}
            disabled={isCheckingUpdates || isInstallingUpdate}
          />
          {updateAvailable && (
            <List.Item
              title="Install Update"
              description="Install the available update"
              left={(props) => <List.Icon {...props} icon="download" />}
              onPress={handleInstallUpdate}
              disabled={isInstallingUpdate}
            />
          )}
          <List.Item
            title="App Version"
            description={`${Constants.expoConfig?.version || '1.0.0'}${isRunningOnUpdate() ? ' (Updated)' : ''}`}
            left={(props) => <List.Icon {...props} icon="information" />}
            disabled
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Advanced</List.Subheader>
          <List.Item
            title={showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
            description="Dangerous operations"
            left={(props) => <List.Icon {...props} icon={showAdvanced ? "chevron-up" : "chevron-down"} />}
            onPress={() => setShowAdvanced(!showAdvanced)}
          />
          {showAdvanced && (
            <>
              <View style={[styles.dangerZone, { backgroundColor: theme.colors.errorContainer + '20', borderColor: theme.colors.error }]}>
                <List.Item
                  title="Delete All Tasks"
                  description={`Move all ${tasks.length} tasks to Trash`}
                  titleStyle={{ color: theme.colors.error }}
                  descriptionStyle={{ color: theme.colors.onErrorContainer }}
                  left={(props) => <List.Icon {...props} icon="delete" color={theme.colors.error} />}
                  onPress={() => setShowDeleteAllConfirmation(true)}
                />
              </View>
            </>
          )}
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Navigation</List.Subheader>
          <List.Item
            title="Trash"
            description="View deleted tasks"
            left={(props) => <List.Icon {...props} icon="delete" />}
            onPress={() => router.push('/trash')}
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

        <DeleteAllConfirmation
          visible={showDeleteAllConfirmation}
          taskCount={tasks.length}
          onConfirm={handleDeleteAll}
          onCancel={() => setShowDeleteAllConfirmation(false)}
        />
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
  dangerZone: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
