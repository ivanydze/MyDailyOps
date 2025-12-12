/**
 * Weekly Checklist Screen (Mobile)
 * Problem 10: Always-Show Tasks → Weekly Checklists
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TextInput, TouchableOpacity } from 'react-native';
import { Appbar, Text, useTheme, Button, Surface, ProgressBar, Chip, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { useWeeklyChecklist } from '../../hooks/useWeeklyChecklist';
import { ChecklistItem } from '../../components/weeklyChecklist/ChecklistItem';
import { getChecklistStats } from '../../utils/weeklyChecklist';
import { getTransparentBackground } from '../../lib/theme';

export default function WeeklyChecklistScreen() {
  const theme = useTheme();
  const router = useRouter();
  const {
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
  } = useWeeklyChecklist();

  const [newItemText, setNewItemText] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCurrentWeekChecklist();
    loadHistory();
  }, [loadCurrentWeekChecklist, loadHistory]);

  useEffect(() => {
    if (currentChecklist) {
      setTitleText(currentChecklist.title || '');
    }
  }, [currentChecklist]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    await loadHistory();
    setRefreshing(false);
  };

  const handleAddItem = async () => {
    if (!newItemText.trim()) return;
    await addItem(newItemText.trim());
    setNewItemText('');
  };

  const handleUpdateItem = async (itemId: string, text: string) => {
    await updateItem(itemId, { text });
  };

  const handleDeleteItem = async (itemId: string) => {
    await deleteItem(itemId);
  };

  const handleToggleItem = async (itemId: string) => {
    await toggleItem(itemId);
  };

  const handleSaveTitle = async () => {
    await updateTitle(titleText);
    setEditingTitle(false);
  };

  const getWeekRangeLabel = () => {
    if (!currentChecklist) return '';
    
    try {
      const start = parseISO(currentChecklist.week_start_date);
      const end = parseISO(currentChecklist.week_end_date);
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    } catch {
      return currentChecklist.week_start_date;
    }
  };

  if (isLoading && !currentChecklist) {
    return (
      <View style={[styles.container, { backgroundColor: getTransparentBackground(theme.dark) }]}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Weekly Checklist" />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            Loading checklist...
          </Text>
        </View>
      </View>
    );
  }

  if (error && !currentChecklist) {
    return (
      <View style={[styles.container, { backgroundColor: getTransparentBackground(theme.dark) }]}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Weekly Checklist" />
        </Appbar.Header>
        <View style={styles.errorContainer}>
          <Text variant="bodyLarge" style={{ color: theme.colors.error }}>
            Error: {error}
          </Text>
          <Button mode="contained" onPress={refresh} style={styles.retryButton}>
            Retry
          </Button>
        </View>
      </View>
    );
  }

  if (!currentChecklist) {
    return (
      <View style={[styles.container, { backgroundColor: getTransparentBackground(theme.dark) }]}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Weekly Checklist" />
        </Appbar.Header>
        <View style={styles.emptyContainer}>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            No checklist available
          </Text>
          <Button mode="contained" onPress={refresh} style={styles.retryButton}>
            Refresh
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: getTransparentBackground(theme.dark) }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Weekly Checklist" subtitle={getWeekRangeLabel()} />
        <Appbar.Action
          icon={showHistory ? 'calendar-today' : 'history'}
          onPress={() => setShowHistory(!showHistory)}
        />
      </Appbar.Header>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {showHistory ? (
          /* History View */
          <View style={styles.historyContainer}>
            <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
              Past Weeks
            </Text>
            {history.length === 0 ? (
              <Surface style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]} elevation={1}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 20 }}>
                  No past checklists yet
                </Text>
              </Surface>
            ) : (
              <View style={styles.historyList}>
                {history.map((checklist) => {
                  const weekStats = getChecklistStats(checklist);
                  const weekLabel = (() => {
                    try {
                      const start = parseISO(checklist.week_start_date);
                      const end = parseISO(checklist.week_end_date);
                      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
                    } catch {
                      return checklist.week_start_date;
                    }
                  })();

                  return (
                    <Surface
                      key={checklist.id}
                      style={[styles.historyCard, { backgroundColor: theme.colors.surface }]}
                      elevation={1}
                    >
                      <View style={styles.historyHeader}>
                        <View style={styles.historyHeaderLeft}>
                          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                            {checklist.title || 'Weekly Checklist'}
                          </Text>
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {weekLabel}
                          </Text>
                        </View>
                        <View style={styles.historyHeaderRight}>
                          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                            {weekStats.completed_items} / {weekStats.total_items}
                          </Text>
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {weekStats.completion_percentage}% complete
                          </Text>
                        </View>
                      </View>
                      <View style={styles.historyItems}>
                        {checklist.items.length === 0 ? (
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>
                            No items
                          </Text>
                        ) : (
                          checklist.items.map((item) => (
                            <ChecklistItem
                              key={item.id}
                              item={item}
                              onToggle={() => {}}
                              onUpdate={() => {}}
                              onDelete={() => {}}
                              isReadonly={true}
                            />
                          ))
                        )}
                      </View>
                    </Surface>
                  );
                })}
              </View>
            )}
          </View>
        ) : (
          /* Current Week View */
          <View style={styles.currentWeekContainer}>
            {/* Title Section */}
            <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
              {editingTitle ? (
                <View style={styles.titleEditContainer}>
                  <TextInput
                    value={titleText}
                    onChangeText={setTitleText}
                    onSubmitEditing={handleSaveTitle}
                    onBlur={handleSaveTitle}
                    autoFocus
                    placeholder="Checklist title (optional)"
                    style={[styles.titleInput, { color: theme.colors.onSurface }]}
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                  />
                </View>
              ) : (
                <TouchableOpacity onPress={() => setEditingTitle(true)}>
                  <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                    {currentChecklist.title || 'Tap to add title (optional)'}
                  </Text>
                </TouchableOpacity>
              )}
            </Surface>

            {/* Stats */}
            {stats.total_items > 0 && (
              <Surface style={[styles.card, { backgroundColor: theme.colors.primaryContainer }]} elevation={1}>
                <View style={styles.statsHeader}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer, fontWeight: '600' }}>
                    Progress
                  </Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer }}>
                    {stats.completed_items} / {stats.total_items} completed
                  </Text>
                </View>
                <ProgressBar
                  progress={stats.completion_percentage / 100}
                  color={theme.colors.primary}
                  style={styles.progressBar}
                />
              </Surface>
            )}

            {/* Add New Item */}
            <View style={styles.addItemContainer}>
              <TextInput
                value={newItemText}
                onChangeText={setNewItemText}
                onSubmitEditing={handleAddItem}
                placeholder="Add new checklist item..."
                style={[styles.addItemInput, { backgroundColor: theme.colors.surface, color: theme.colors.onSurface }]}
                placeholderTextColor={theme.colors.onSurfaceVariant}
              />
              <IconButton
                icon="plus"
                iconColor={theme.colors.primary}
                size={24}
                onPress={handleAddItem}
                disabled={!newItemText.trim()}
              />
            </View>

            {/* Items List */}
            <View style={styles.itemsList}>
              {currentChecklist.items.length === 0 ? (
                <Surface style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]} elevation={1}>
                  <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 20 }}>
                    No items yet. Add your first item above!
                  </Text>
                </Surface>
              ) : (
                currentChecklist.items.map((item) => (
                  <ChecklistItem
                    key={item.id}
                    item={item}
                    onToggle={() => handleToggleItem(item.id)}
                    onUpdate={(text) => handleUpdateItem(item.id, text)}
                    onDelete={() => handleDeleteItem(item.id)}
                  />
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  retryButton: {
    marginTop: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  currentWeekContainer: {
    marginTop: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  titleEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    paddingVertical: 8,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  addItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  addItemInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  itemsList: {
    marginTop: 8,
  },
  historyContainer: {
    marginTop: 16,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: '600',
  },
  historyList: {
    gap: 16,
  },
  historyCard: {
    borderRadius: 16,
    padding: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  historyHeaderLeft: {
    flex: 1,
  },
  historyHeaderRight: {
    alignItems: 'flex-end',
  },
  historyItems: {
    marginTop: 8,
  },
});

