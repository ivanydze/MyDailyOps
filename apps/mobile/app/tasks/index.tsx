import { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Appbar, Searchbar, Menu, useTheme, Text, Portal, Dialog, Button, Snackbar, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { TaskCard } from '../../components/TaskCard';
import { FilterBanner } from '../../components/FilterBanner';
import { SectionHeader } from '../../components/SectionHeader';
import { useSync } from '../../hooks/useSync';
import { Task, TaskFilter } from '../../types/task';
import { FAB } from '../../components/FAB';
import { groupTasksByDate } from '../../utils/groupTasksByDate';
import { getTransparentBackground } from '../../lib/theme';

/**
 * Main tasks screen with full functionality
 */
export default function TasksScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { tasks, loading, syncing, error, refreshTasks, syncTasks, deleteTask, toggleTaskStatus } = useSync();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<TaskFilter>('all');
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  /**
   * Filter and search tasks
   */
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Apply filter
    if (currentFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);

      result = result.filter((task) => {
        switch (currentFilter) {
          case 'today':
            // Exclude completed tasks from today filter (they show in Completed/All only)
            return task.deadline && new Date(task.deadline) <= tomorrow && task.status !== 'done';
          case 'tomorrow':
            // Exclude completed tasks from tomorrow filter
            const deadline = task.deadline ? new Date(task.deadline) : null;
            return deadline && deadline >= tomorrow && deadline < new Date(tomorrow.getTime() + 86400000) && task.status !== 'done';
          case 'this_week':
            // Exclude completed tasks from this_week filter
            return task.deadline && new Date(task.deadline) <= weekEnd && task.status !== 'done';
          case 'overdue':
            // Already excludes completed (task.status !== 'done')
            return task.deadline && new Date(task.deadline) < today && task.status !== 'done';
          case 'done':
            // Only show completed tasks
            return task.status === 'done';
          default:
            return true;
        }
      });
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query) ||
          task.category.toLowerCase().includes(query)
      );
    }

    return result;
  }, [tasks, currentFilter, searchQuery]);

  /**
   * Group tasks by deadline using the new grouping utility
   * If filter is 'done', show completed tasks directly without grouping
   * If filter is 'all', include completed tasks in a separate section
   */
  const groupedTasks = useMemo(() => {
    // For 'done' filter, don't group - return empty groups and completed tasks separately
    if (currentFilter === 'done') {
      const completedTasks = filteredTasks.filter(task => task.status === 'done');
      return {
        overdue: [],
        today: [],
        tomorrow: [],
        thisWeek: [],
        nextWeek: [],
        future: [],
        completed: completedTasks,
      };
    }
    
    // For 'all' filter, group active tasks and include completed separately
    if (currentFilter === 'all') {
      const activeTasks = filteredTasks.filter(task => task.status !== 'done');
      const completedTasks = filteredTasks.filter(task => task.status === 'done');
      const grouped = groupTasksByDate(activeTasks);
      return {
        ...grouped,
        completed: completedTasks,
      };
    }
    
    // For other filters (today, tomorrow, etc.), group normally (completed already filtered out)
    return groupTasksByDate(filteredTasks);
  }, [filteredTasks, currentFilter]);

  const handleToggleSearch = () => {
    setSearchVisible(!searchVisible);
    if (searchVisible) {
      setSearchQuery('');
    }
  };

  const handleFilterSelect = (filter: TaskFilter) => {
    setCurrentFilter(filter);
    setFilterMenuVisible(false);
  };

  const handleDeleteConfirm = async () => {
    if (taskToDelete) {
      await deleteTask(taskToDelete.id);
      setDeleteDialogVisible(false);
      setTaskToDelete(null);
    }
  };

  /**
   * Render a section of grouped tasks
   */
  const renderSection = (title: string, tasks: Task[]) => {
    if (tasks.length === 0) return null;

    return (
      <View key={title} style={styles.section}>
        <SectionHeader title={title} count={tasks.length} />
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onPress={() => router.push(`/tasks/edit?id=${task.id}`)}
            onEdit={() => router.push(`/tasks/edit?id=${task.id}`)}
            onDelete={() => {
              setTaskToDelete(task);
              setDeleteDialogVisible(true);
            }}
            onToggleStatus={() => toggleTaskStatus(task)}
          />
        ))}
      </View>
    );
  };

  /**
   * Prepare sections in the required order
   * Include Completed section when there are completed tasks
   */
  const sections = useMemo(() => {
    const baseSections = [
      { title: 'Overdue', tasks: groupedTasks.overdue },
      { title: 'Today', tasks: groupedTasks.today },
      { title: 'Tomorrow', tasks: groupedTasks.tomorrow },
      { title: 'This Week', tasks: groupedTasks.thisWeek },
      { title: 'Next Week', tasks: groupedTasks.nextWeek },
      { title: 'Future', tasks: groupedTasks.future },
    ];
    
    // Add Completed section if it exists and has tasks
    if (groupedTasks.completed && groupedTasks.completed.length > 0) {
      // For 'done' filter, show completed first
      if (currentFilter === 'done') {
        return [{ title: 'Completed', tasks: groupedTasks.completed }];
      }
      // For 'all' filter, show completed at the end
      return [...baseSections, { title: 'Completed', tasks: groupedTasks.completed }]
        .filter(section => section.tasks.length > 0);
    }
    
    return baseSections.filter(section => section.tasks.length > 0);
  }, [groupedTasks, currentFilter]);

  return (
    <View style={[styles.container, { backgroundColor: getTransparentBackground(theme.dark) }]}>
      <Appbar.Header>
        <Appbar.Content title="MyDailyOps" />
        <Appbar.Action icon="magnify" onPress={handleToggleSearch} />
        <Appbar.Action
          icon="filter-variant"
          onPress={() => setFilterMenuVisible(true)}
        />
        <Appbar.Action icon="refresh" onPress={syncTasks} disabled={syncing} />
        <Appbar.Action icon="cog" onPress={() => router.push('/settings')} />
      </Appbar.Header>

      <Portal>
        <Menu
          visible={filterMenuVisible}
          onDismiss={() => setFilterMenuVisible(false)}
          anchor={{ x: 0, y: 100 }}
        >
          <Menu.Item onPress={() => handleFilterSelect('all')} title="All Tasks" />
          <Menu.Item onPress={() => handleFilterSelect('today')} title="Today" />
          <Menu.Item onPress={() => handleFilterSelect('tomorrow')} title="Tomorrow" />
          <Menu.Item onPress={() => handleFilterSelect('this_week')} title="This Week" />
          <Menu.Item onPress={() => handleFilterSelect('overdue')} title="Overdue" />
          <Divider />
          <Menu.Item onPress={() => handleFilterSelect('done')} title="Completed" />
        </Menu>
      </Portal>

      {searchVisible && (
        <Searchbar
          placeholder="Search tasks..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      )}

      <FilterBanner
        filter={currentFilter}
        visible={currentFilter !== 'all'}
        onDismiss={() => setCurrentFilter('all')}
      />

      {syncing && (
        <Text style={[styles.syncingText, { color: theme.colors.primary }]}>
          🔄 Syncing...
        </Text>
      )}

      <FlatList
        data={sections}
        keyExtractor={(item) => item.title}
        renderItem={({ item }) => renderSection(item.title, item.tasks)}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              {searchQuery
                ? 'No tasks found'
                : currentFilter === 'all'
                ? 'No tasks yet. Tap + to create one!'
                : 'No tasks match this filter'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refreshTasks}
            colors={[theme.colors.primary]}
          />
        }
      />

      <FAB icon="plus" onPress={() => router.push('/tasks/add')} />

      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Delete Task</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to delete "{taskToDelete?.title}"?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleDeleteConfirm} textColor={theme.colors.error}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={!!error}
        onDismiss={() => {}}
        duration={4000}
        action={{
          label: 'Retry',
          onPress: syncTasks,
        }}
      >
        {error}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchbar: {
    margin: 16,
    marginTop: 8,
  },
  syncingText: {
    textAlign: 'center',
    paddingVertical: 8,
    fontSize: 12,
  },
  section: {
    marginBottom: 8,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 80,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
});
