/**
 * Mobile Calendar Screen
 * 
 * Mobile-optimized calendar view with Day/Week/Month views.
 * Implements Phase 10: Mobile Calendar Screen
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Dimensions } from 'react-native';
import { 
  Appbar, 
  Text, 
  useTheme, 
  SegmentedButtons,
  IconButton,
  Surface,
  Chip,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isToday, isEqual, startOfDay, eachDayOfInterval, getYear } from 'date-fns';
import { useCalendarTasks } from '../../hooks/useCalendarTasks';
import { TaskCard } from '../../components/TaskCard';
import { getTransparentBackground } from '../../lib/theme';
import { useSync } from '../../hooks/useSync';

type CalendarView = 'day' | 'week' | 'month';

export default function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { toggleTaskStatus, updateTask } = useSync();
  
  const [view, setView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [includeCompleted, setIncludeCompleted] = useState(false);

  // Get calendar data
  const { dayGroups, isLoading, error, refresh } = useCalendarTasks({
    view,
    centerDate: selectedDate,
    includeCompleted,
  });

  // Handle navigation
  const handlePrevious = () => {
    switch (view) {
      case 'day':
        setSelectedDate(subDays(selectedDate, 1));
        break;
      case 'week':
        setSelectedDate(subWeeks(selectedDate, 1));
        break;
      case 'month':
        setSelectedDate(subMonths(selectedDate, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (view) {
      case 'day':
        setSelectedDate(addDays(selectedDate, 1));
        break;
      case 'week':
        setSelectedDate(addWeeks(selectedDate, 1));
        break;
      case 'month':
        setSelectedDate(addMonths(selectedDate, 1));
        break;
    }
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // Get date range display text
  const getDateRangeText = () => {
    switch (view) {
      case 'day':
        return format(selectedDate, 'EEEE, MMMM d, yyyy');
      case 'week':
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      case 'month':
        return format(selectedDate, 'MMMM yyyy');
      default:
        return format(selectedDate, 'MMMM d, yyyy');
    }
  };

  // Render Day View
  const renderDayView = () => {
    const dayGroup = dayGroups.find(dg => {
      const dgDate = startOfDay(dg.date);
      const selDate = startOfDay(selectedDate);
      return isEqual(dgDate, selDate);
    }) || { date: selectedDate, dateKey: format(selectedDate, 'yyyy-MM-dd'), tasks: [] };

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.dayContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} colors={[theme.colors.primary]} />
        }
      >
        {dayGroup.tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              No tasks for this day
            </Text>
          </View>
        ) : (
          dayGroup.tasks.map((calendarTask) => (
            <TaskCard
              key={calendarTask.task.id}
              task={calendarTask.task as any as Task}
              onPress={() => router.push(`/tasks/edit?id=${calendarTask.task.id}`)}
              onEdit={() => router.push(`/tasks/edit?id=${calendarTask.task.id}`)}
              onToggleStatus={() => toggleTaskStatus(calendarTask.task as any as Task)}
            />
          ))
        )}
      </ScrollView>
    );
  };

  // Render Week View
  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.weekContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} colors={[theme.colors.primary]} />
        }
      >
        {weekDays.map((day) => {
          const dayGroup = dayGroups.find(dg => {
            const dgDate = startOfDay(dg.date);
            const dayDate = startOfDay(day);
            return isEqual(dgDate, dayDate);
          }) || { date: day, dateKey: format(day, 'yyyy-MM-dd'), tasks: [] };

          const isTodayDate = isToday(day);

          return (
            <Surface key={dayGroup.dateKey} style={[styles.weekDayCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
              <View style={styles.weekDayHeader}>
                <View style={styles.weekDayHeaderLeft}>
                  <Text variant="titleSmall" style={{ fontWeight: '600', color: theme.colors.onSurface }}>
                    {format(day, 'EEE')}
                  </Text>
                  <Text 
                    variant="titleLarge" 
                    style={[
                      { fontWeight: '700', marginLeft: 8 },
                      isTodayDate && { color: theme.colors.primary }
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                  {isTodayDate && (
                    <Chip compact style={[styles.todayChip, { backgroundColor: theme.colors.primaryContainer }]}>
                      Today
                    </Chip>
                  )}
                </View>
                <Chip compact>{dayGroup.tasks.length}</Chip>
              </View>

              {dayGroup.tasks.length === 0 ? (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, paddingVertical: 12 }}>
                  No tasks
                </Text>
              ) : (
                <View style={styles.weekDayTasks}>
                  {dayGroup.tasks.slice(0, 3).map((calendarTask) => (
                    <TouchableOpacity
                      key={calendarTask.task.id}
                      style={[styles.weekTaskItem, { backgroundColor: theme.colors.surfaceVariant }]}
                      onPress={() => router.push(`/tasks/edit?id=${calendarTask.task.id}`)}
                    >
                      <View style={[styles.weekTaskDot, { backgroundColor: theme.colors.primary }]} />
                      <Text 
                        variant="bodySmall" 
                        numberOfLines={1}
                        style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}
                      >
                        {calendarTask.task.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {dayGroup.tasks.length > 3 && (
                    <Text variant="bodySmall" style={{ color: theme.colors.primary, marginTop: 4 }}>
                      +{dayGroup.tasks.length - 3} more
                    </Text>
                  )}
                </View>
              )}
            </Surface>
          );
        })}
      </ScrollView>
    );
  };

  // Render Month View
  const renderMonthView = () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    // Create map of tasks by date
    const tasksByDate = new Map<string, typeof dayGroups[0]['tasks']>();
    dayGroups.forEach(dg => {
      tasksByDate.set(dg.dateKey, dg.tasks);
    });

    // Week day headers
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.monthContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} colors={[theme.colors.primary]} />
        }
      >
        {/* Week Day Headers */}
        <View style={styles.monthHeader}>
          {weekDays.map((dayName) => (
            <View key={dayName} style={styles.monthHeaderCell}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontWeight: '600' }}>
                {dayName}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.monthGrid}>
          {calendarDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const tasks = tasksByDate.get(dateKey) || [];
            const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
            const isTodayDate = isToday(day);

            return (
              <TouchableOpacity
                key={dateKey}
                style={[
                  styles.monthDayCell,
                  { backgroundColor: theme.colors.surface },
                  isTodayDate && { backgroundColor: theme.colors.primaryContainer },
                  !isCurrentMonth && { opacity: 0.3 },
                ]}
                onPress={() => {
                  setView('day');
                  setSelectedDate(day);
                }}
              >
                <Text
                  variant="bodyMedium"
                  style={[
                    { color: theme.colors.onSurface },
                    isTodayDate && { color: theme.colors.onPrimaryContainer, fontWeight: '700' },
                    !isCurrentMonth && { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {format(day, 'd')}
                </Text>
                {tasks.length > 0 && (
                  <View style={styles.monthTaskIndicator}>
                    <View 
                      style={[
                        styles.monthTaskDot,
                        { backgroundColor: tasks.length > 3 ? '#ef4444' : tasks.length > 1 ? '#f59e0b' : theme.colors.primary }
                      ]} 
                    />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: getTransparentBackground(theme.dark) }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Calendar" />
        <Appbar.Action 
          icon={includeCompleted ? 'check-circle' : 'circle-outline'} 
          onPress={() => setIncludeCompleted(!includeCompleted)}
        />
        <Appbar.Action icon="refresh" onPress={refresh} />
      </Appbar.Header>

      {/* View Selector */}
      <View style={styles.viewSelector}>
        <SegmentedButtons
          value={view}
          onValueChange={(value) => setView(value as CalendarView)}
          buttons={[
            { value: 'day', label: 'Day' },
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
          ]}
        />
      </View>

      {/* Date Navigation */}
      <View style={[styles.dateNavigation, { backgroundColor: theme.colors.surface }]}>
        <IconButton icon="chevron-left" onPress={handlePrevious} />
        <TouchableOpacity style={styles.dateTextContainer} onPress={handleToday}>
          <Text variant="titleMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>
            {getDateRangeText()}
          </Text>
        </TouchableOpacity>
        <IconButton icon="chevron-right" onPress={handleNext} />
      </View>

      {/* Calendar Content */}
      {view === 'day' && renderDayView()}
      {view === 'week' && renderWeekView()}
      {view === 'month' && renderMonthView()}

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={{ color: theme.colors.error }}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CELL_SIZE = (SCREEN_WIDTH - 32 - 12) / 7; // 7 columns, 16px padding each side, 12px gap total

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  viewSelector: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  dateTextContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  scrollView: {
    flex: 1,
  },
  dayContent: {
    padding: 16,
    paddingBottom: 100,
  },
  weekContent: {
    padding: 16,
    paddingBottom: 100,
  },
  weekDayCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  weekDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weekDayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayChip: {
    marginLeft: 8,
  },
  weekDayTasks: {
    gap: 8,
  },
  weekTaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
  },
  weekTaskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  monthContent: {
    padding: 16,
    paddingBottom: 100,
  },
  monthHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  monthHeaderCell: {
    width: CELL_SIZE,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1.5,
  },
  monthDayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 8,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 6,
  },
  monthTaskIndicator: {
    width: '100%',
    alignItems: 'center',
  },
  monthTaskDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
});

