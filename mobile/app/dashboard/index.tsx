import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Surface, useTheme, IconButton, ProgressBar, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useDashboard, getTimeUntil, getDayLabel } from '../../hooks/useDashboard';
import { Task } from '../../types/task';

/**
 * Motion/Notion Hybrid Dashboard
 * Clean, fast, block-based design
 */
export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { today, overdue, upcoming, weekly, categories, loading, syncing, refresh } = useDashboard();

  const priorityColors = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#22c55e',
  };

  const renderTaskItem = (task: Task, showBadge = true) => (
    <TouchableOpacity
      key={task.id}
      style={[styles.taskItem, { backgroundColor: theme.colors.surface }]}
      onPress={() => router.push(`/tasks/edit?id=${task.id}`)}
      activeOpacity={0.7}
    >
      <View style={[styles.priorityDot, { backgroundColor: priorityColors[task.priority] }]} />
      <View style={styles.taskContent}>
        <Text variant="bodyMedium" numberOfLines={1} style={{ color: theme.colors.onSurface }}>
          {task.title}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {task.category}
        </Text>
      </View>
      {showBadge && task.deadline && (
        <Chip compact mode="flat" style={styles.timeBadge}>
          {getTimeUntil(task.deadline)}
        </Chip>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text variant="headlineMedium" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
            Dashboard
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <IconButton icon="refresh" onPress={refresh} loading={syncing} />
          <IconButton icon="cog" onPress={() => router.push('/settings')} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} colors={[theme.colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Add Bar */}
        <TouchableOpacity
          style={[styles.quickAdd, { backgroundColor: theme.colors.primaryContainer }]}
          onPress={() => router.push('/tasks/add')}
          activeOpacity={0.8}
        >
          <IconButton icon="plus" size={20} iconColor={theme.colors.onPrimaryContainer} />
          <Text variant="bodyLarge" style={{ color: theme.colors.onPrimaryContainer, flex: 1 }}>
            Add new task
          </Text>
        </TouchableOpacity>

        {/* Week Progress */}
        <Surface style={styles.card} elevation={1}>
          <View style={styles.cardHeader}>
            <Text variant="titleMedium" style={{ fontWeight: '600' }}>Week Progress</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {weekly.completed}/{weekly.total} tasks
            </Text>
          </View>
          <ProgressBar
            progress={weekly.percent / 100}
            color={theme.colors.primary}
            style={styles.progressBar}
          />
          <Text variant="bodySmall" style={{ color: theme.colors.primary, marginTop: 4 }}>
            {weekly.percent}% complete
          </Text>
        </Surface>

        {/* Overdue Block */}
        {overdue.length > 0 && (
          <Surface style={[styles.card, styles.overdueCard]} elevation={1}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.statusDot, { backgroundColor: '#ef4444' }]} />
                <Text variant="titleMedium" style={{ fontWeight: '600', color: '#dc2626' }}>
                  Overdue
                </Text>
              </View>
              <Chip compact style={{ backgroundColor: '#fecaca' }} textStyle={{ color: '#dc2626' }}>
                {overdue.length}
              </Chip>
            </View>
            {overdue.slice(0, 3).map((task) => renderTaskItem(task))}
            {overdue.length > 3 && (
              <TouchableOpacity onPress={() => router.push('/tasks')}>
                <Text variant="bodySmall" style={styles.viewMore}>
                  +{overdue.length - 3} more overdue tasks →
                </Text>
              </TouchableOpacity>
            )}
          </Surface>
        )}

        {/* Today Block */}
        <Surface style={styles.card} elevation={1}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.statusDot, { backgroundColor: theme.colors.primary }]} />
              <Text variant="titleMedium" style={{ fontWeight: '600' }}>Today</Text>
            </View>
            <Chip compact>{today.length}</Chip>
          </View>
          {today.length === 0 ? (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, paddingVertical: 12 }}>
              No tasks due today 🎉
            </Text>
          ) : (
            today.map((task) => renderTaskItem(task))
          )}
        </Surface>

        {/* Upcoming Block */}
        <Surface style={styles.card} elevation={1}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.statusDot, { backgroundColor: '#8b5cf6' }]} />
              <Text variant="titleMedium" style={{ fontWeight: '600' }}>Upcoming</Text>
            </View>
          </View>
          {upcoming.length === 0 ? (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, paddingVertical: 12 }}>
              No upcoming tasks
            </Text>
          ) : (
            <>
              {upcoming.map((task) => (
                <View key={task.id}>
                  {task.deadline && (
                    <Text variant="labelSmall" style={styles.dayLabel}>
                      {getDayLabel(task.deadline)}
                    </Text>
                  )}
                  {renderTaskItem(task, false)}
                </View>
              ))}
            </>
          )}
          <TouchableOpacity onPress={() => router.push('/tasks')}>
            <Text variant="bodySmall" style={styles.viewMore}>
              View all tasks →
            </Text>
          </TouchableOpacity>
        </Surface>

        {/* Category Stats */}
        <Surface style={styles.card} elevation={1}>
          <Text variant="titleMedium" style={{ fontWeight: '600', marginBottom: 12 }}>
            By Category
          </Text>
          <View style={styles.categoryGrid}>
            {Object.entries(categories).slice(0, 6).map(([cat, count]) => (
              <View key={cat} style={[styles.categoryCard, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text variant="titleLarge" style={{ fontWeight: '700', color: theme.colors.primary }}>
                  {count}
                </Text>
                <Text variant="bodySmall" numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>
                  {cat}
                </Text>
              </View>
            ))}
            {Object.keys(categories).length === 0 && (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                No active tasks
              </Text>
            )}
          </View>
        </Surface>

        {/* Bottom spacing */}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push('/tasks/add')}
        activeOpacity={0.9}
      >
        <IconButton icon="plus" size={28} iconColor={theme.colors.onPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  quickAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 16,
    paddingRight: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  overdueCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  timeBadge: {
    marginLeft: 8,
  },
  dayLabel: {
    marginTop: 8,
    marginBottom: 4,
    marginLeft: 4,
    color: '#6b7280',
    fontWeight: '600',
  },
  viewMore: {
    color: '#6366f1',
    marginTop: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    width: '31%',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

