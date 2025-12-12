import React, { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSync } from '../../hooks/useSync';
import { useAuth } from '../../contexts/AuthContext';
import { Task } from '../../types/task';
import TaskCard from '../../components/TaskCard';
import { isUpcoming } from '../../utils/visibility';
import { parseISO } from 'date-fns';
import { isRecurringTemplate } from '../../utils/recurring';
import { FAB, Card, Chip, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Upcoming Screen - Shows tasks that will become visible in the next 7 days
 * Implements Problem 4: Future Tasks Must Be Visible in Advance
 * 
 * Uses isUpcoming() function from visibility engine to filter tasks where:
 * visible_from > today && visible_from <= today + 7 days
 */
export default function UpcomingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { tasks, loading, refreshing, refreshTasks } = useSync();

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user]);

  // Filter tasks for upcoming (next 7 days) using visibility engine (Problem 4)
  const upcomingTasks = useMemo(() => {
    return tasks.filter((task: Task) => {
      // Hide completed tasks
      if (task.status === 'done') return false;

      // Use visibility fields to check if task is upcoming
      const visibleFrom = (task as any).visible_from;
      
      if (visibleFrom) {
        // Task has visible_from - use isUpcoming() function
        return isUpcoming(visibleFrom, new Date(), 7);
      }

      // Legacy: tasks without visible_from are not considered upcoming
      return false;
    });
  }, [tasks]);

  // Group tasks by day (when they become visible)
  const tasksByDay = useMemo(() => {
    const grouped = upcomingTasks.reduce((acc, task) => {
      const visibleFrom = (task as any).visible_from;
      if (!visibleFrom) return acc;

      try {
        const date = parseISO(visibleFrom).toDateString();
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(task);
        return acc;
      } catch {
        return acc;
      }
    }, {} as Record<string, Task[]>);

    // Sort days chronologically
    const sortedDays = Object.keys(grouped).sort((a, b) => {
      try {
        return parseISO((grouped[a][0] as any).visible_from).getTime() - 
               parseISO((grouped[b][0] as any).visible_from).getTime();
      } catch {
        return 0;
      }
    });

    // Sort tasks within each day: by priority, then by deadline
    sortedDays.forEach((day) => {
      grouped[day].sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        if (a.deadline && b.deadline) {
          return parseISO(a.deadline).getTime() - parseISO(b.deadline).getTime();
        }
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return 0;
      });
    });

    return { grouped, sortedDays };
  }, [upcomingTasks]);

  // Format day label (Today, Tomorrow, or date)
  const formatDayLabel = (dateString: string) => {
    const date = parseISO((tasksByDay.grouped[dateString][0] as any).visible_from);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    if (targetDate.getTime() === today.getTime()) {
      return 'Today';
    }
    if (targetDate.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    }
    
    // Format as weekday + date (e.g., "Monday, Jan 15")
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const handleToggleStatus = async (task: Task) => {
    // Prevent completing recurring templates (Problem 9)
    if (isRecurringTemplate(task)) {
      // Show alert or toast - in mobile we might want to use Alert
      return;
    }
    // Toggle handled by TaskCard component
  };

  const handleTaskPress = (task: Task) => {
    router.push(`/tasks/${task.id}/edit`);
  };

  if (loading && tasks.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading upcoming tasks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Upcoming</Text>
        <Text style={styles.subtitle}>
          {upcomingTasks.length} {upcomingTasks.length === 1 ? 'task' : 'tasks'} in the next 7 days
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshTasks} />
        }
      >
        {upcomingTasks.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Text style={styles.emptyTitle}>No upcoming tasks</Text>
              <Text style={styles.emptySubtitle}>
                Tasks with deadlines in the next 7 days will appear here
              </Text>
            </Card.Content>
          </Card>
        ) : (
          <View style={styles.tasksContainer}>
            {tasksByDay.sortedDays.map((day) => (
              <View key={day} style={styles.daySection}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayLabel}>{formatDayLabel(day)}</Text>
                  <Chip mode="flat" compact>
                    {tasksByDay.grouped[day].length}
                  </Chip>
                </View>
                <Divider style={styles.divider} />
                <View style={styles.tasksList}>
                  {tasksByDay.grouped[day].map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onPress={() => handleTaskPress(task)}
                      onToggleStatus={handleToggleStatus}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/tasks/new')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyCard: {
    marginTop: 32,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  tasksContainer: {
    gap: 24,
  },
  daySection: {
    marginBottom: 16,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    marginBottom: 12,
  },
  tasksList: {
    gap: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
});

