/**
 * Trash Screen (Mobile)
 * Problem 13: View and manage soft-deleted tasks
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Appbar, List, Button, useTheme, FAB, Chip, Dialog, Portal, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { loadTrashFromCache, emptyTrash, hardDeleteTask, restoreTask } from '../../database/dbTrash';
import { useAuth } from '../../contexts/AuthContext';
import { useSync } from '../../hooks/useSync';
import { deleteTaskFromSupabase } from '../../lib/sync';
import { syncNow } from '../../lib/sync';
import { format, parseISO } from 'date-fns';
import { Task } from '../../types/task';
import { getTransparentBackground } from '../../lib/theme';

export default function TrashScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { userId } = useAuth();
  const { refreshTasks } = useSync();
  const [trashTasks, setTrashTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEmptying, setIsEmptying] = useState(false);
  const [emptyDialogVisible, setEmptyDialogVisible] = useState(false);

  useEffect(() => {
    if (userId) {
      loadTrash();
    }
  }, [userId]);

  const loadTrash = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const tasks = await loadTrashFromCache(userId);
      setTrashTasks(tasks);
    } catch (error: any) {
      console.error('[Trash] Error loading trash:', error);
      Alert.alert('Error', 'Failed to load trash');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (taskId: string) => {
    if (!userId) return;

    try {
      // Restore in cache
      await restoreTask(taskId, userId);
      // Sync to Supabase (task will have deleted_at = null and will be pushed)
      await syncNow();
      await loadTrash();
      await refreshTasks();
      Alert.alert('Success', 'Task restored successfully');
    } catch (error: any) {
      console.error('[Trash] Error restoring task:', error);
      Alert.alert('Error', error.message || 'Failed to restore task');
    }
  };

  const handleHardDelete = (taskId: string) => {
    Alert.alert(
      'Permanently Delete',
      'Are you sure you want to permanently delete this task? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!userId) return;
            try {
              await hardDeleteTask(taskId, userId);
              await loadTrash();
              Alert.alert('Success', 'Task permanently deleted');
            } catch (error: any) {
              console.error('[Trash] Error hard deleting task:', error);
              Alert.alert('Error', error.message || 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  const handleEmptyTrash = async () => {
    if (!userId) return;

    try {
      setIsEmptying(true);
      // Get all trash task IDs before deleting
      const trashTasks = await loadTrashFromCache(userId);
      const trashTaskIds = trashTasks.map(t => t.id);

      // Hard delete all from cache
      const count = await emptyTrash(userId);

      // Hard delete all from Supabase
      for (const taskId of trashTaskIds) {
        try {
          await deleteTaskFromSupabase(taskId, userId);
        } catch (error) {
          console.warn(`[Trash] Failed to delete task ${taskId} from Supabase:`, error);
          // Continue deleting other tasks even if one fails
        }
      }

      await loadTrash();
      setEmptyDialogVisible(false);
      Alert.alert('Success', `Permanently deleted ${count} task${count !== 1 ? 's' : ''}`);
    } catch (error: any) {
      console.error('[Trash] Error emptying trash:', error);
      Alert.alert('Error', error.message || 'Failed to empty trash');
    } finally {
      setIsEmptying(false);
    }
  };

  const getDaysSinceDeletion = (deletedAt: string | null): number => {
    if (!deletedAt) return 0;
    const deleted = parseISO(deletedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - deleted.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return theme.colors.error;
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#22c55e';
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: getTransparentBackground(theme.dark) }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content 
          title="Trash"
          subtitle={trashTasks.length > 0 ? `${trashTasks.length} task${trashTasks.length !== 1 ? 's' : ''}` : undefined}
        />
        {trashTasks.length > 0 && (
          <Appbar.Action
            icon="delete-sweep"
            onPress={() => setEmptyDialogVisible(true)}
            disabled={isEmptying}
          />
        )}
      </Appbar.Header>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadTrash} colors={[theme.colors.primary]} />
        }
      >
        {trashTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              Trash is empty
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
              Deleted tasks will appear here. They can be restored within 30 days.
            </Text>
          </View>
        ) : (
          <>
            {trashTasks.map((task) => {
              const deletedAt = (task as any).deleted_at;
              const daysSince = getDaysSinceDeletion(deletedAt);
              const isOld = daysSince >= 25;

              return (
                <List.Item
                  key={task.id}
                  title={task.title}
                  description={
                    <>
                      {task.description && (
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {task.description}
                        </Text>
                      )}
                      {deletedAt && (
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                          Deleted {format(parseISO(deletedAt), "MMM d, yyyy")} ({daysSince} day{daysSince !== 1 ? 's' : ''} ago)
                          {isOld && ' • Will be auto-purged soon'}
                        </Text>
                      )}
                    </>
                  }
                  left={(props) => (
                    <View style={styles.leftContent}>
                      <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(task.priority) }]} />
                      {task.category && (
                        <Chip compact style={styles.categoryChip}>
                          {task.category}
                        </Chip>
                      )}
                    </View>
                  )}
                  right={(props) => (
                    <View style={styles.actions}>
                      <Button
                        mode="text"
                        icon="restore"
                        onPress={() => handleRestore(task.id)}
                        textColor={theme.colors.primary}
                        compact
                      >
                        Restore
                      </Button>
                      <Button
                        mode="text"
                        icon="delete"
                        onPress={() => handleHardDelete(task.id)}
                        textColor={theme.colors.error}
                        compact
                      >
                        Delete
                      </Button>
                    </View>
                  )}
                  style={styles.taskItem}
                />
              );
            })}

            <View style={[styles.notice, { backgroundColor: theme.colors.errorContainer + '40', borderColor: theme.colors.error }]}>
              <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer }}>
                ⚠️ Tasks in Trash are automatically permanently deleted after 30 days.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <Portal>
        <Dialog
          visible={emptyDialogVisible}
          onDismiss={() => setEmptyDialogVisible(false)}
        >
          <Dialog.Title>Empty Trash</Dialog.Title>
          <Dialog.Content>
            <Text>
              Permanently delete all {trashTasks.length} task{trashTasks.length !== 1 ? 's' : ''} in Trash?
              This cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEmptyDialogVisible(false)}>Cancel</Button>
            <Button
              onPress={handleEmptyTrash}
              textColor={theme.colors.error}
              loading={isEmptying}
            >
              Empty
            </Button>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  taskItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
    borderRadius: 8,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryChip: {
    marginRight: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
  },
  notice: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
  },
});

