import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Card, Text, IconButton, useTheme, Chip } from 'react-native-paper';
import { Task } from '../types/task';
import { priorityColors, statusColors } from '../lib/theme';
import { isRecurringTemplate } from '../utils/recurring';

interface TaskCardProps {
  task: Task;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleStatus?: () => void;
}

/**
 * Format deadline date in Desktop style: "MMM d, yyyy, HH:mm"
 */
function formatDeadline(deadline: string): string {
  const date = new Date(deadline);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Check if deadline is overdue or upcoming
 * Returns label and status for deadline display
 */
function getDeadlineStatus(deadline: string, isCompleted: boolean) {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  
  // Check if overdue (past deadline and not completed)
  if (!isCompleted && deadlineDate < now) {
    const timeStr = deadlineDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    return { 
      label: `Overdue, ${timeStr}`, 
      isOverdue: true 
    };
  }
  
  // Check if today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDay = new Date(deadlineDate);
  deadlineDay.setHours(0, 0, 0, 0);
  
  const diffDays = Math.floor((deadlineDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    const timeStr = deadlineDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    return { label: `Today, ${timeStr}`, isToday: true };
  }
  
  if (diffDays === 1) {
    const timeStr = deadlineDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    return { label: `Tomorrow, ${timeStr}`, isTomorrow: true };
  }
  
  // Default: show full formatted date
  return { label: formatDeadline(deadline), isUpcoming: true };
}

export function TaskCard({
  task,
  onPress,
  onEdit,
  onDelete,
  onToggleStatus,
}: TaskCardProps) {
  const theme = useTheme();
  const isDark = theme.dark;
  const isCompleted = task.status === 'done';
  const isTemplate = isRecurringTemplate(task);

  const priorityColor = isDark
    ? priorityColors.dark[task.priority]
    : priorityColors.light[task.priority];

  const statusColor = isDark
    ? statusColors.dark[task.status]
    : statusColors.light[task.status];

  const statusIcon =
    task.status === 'done'
      ? 'check-circle'
      : task.status === 'in_progress'
      ? 'progress-clock'
      : 'circle-outline';

  // Get deadline status
  const deadlineStatus = task.deadline ? getDeadlineStatus(task.deadline, isCompleted) : null;

  return (
    <Card
      mode="elevated"
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface },
        task.pinned && { borderColor: theme.colors.primary, borderWidth: 2 },
        isCompleted && { opacity: 0.6 },
      ]}
    >
      <Pressable onPress={onPress}>
        <View style={styles.cardContent}>
          {/* Top row: Priority dot + Title + Status button */}
          <View style={styles.topRow}>
            {/* Priority dot */}
            <View
              style={[
                styles.priorityDot,
                { backgroundColor: priorityColor },
              ]}
            />

            {/* Title and Status button in same row */}
            <View style={styles.titleRow}>
              <Text
                variant="titleMedium"
                style={[
                  styles.title,
                  { color: theme.colors.onSurface },
                  isCompleted && styles.strikethrough,
                ]}
                numberOfLines={1}
              >
                {task.title}
              </Text>
              {task.pinned && (
                <Text style={styles.pinnedIcon}>📌</Text>
              )}
              
              {/* Status button - hidden for recurring templates */}
              {!isTemplate && (
                <IconButton
                  icon={statusIcon}
                  iconColor={statusColor}
                  size={24}
                  onPress={onToggleStatus}
                  style={styles.statusButton}
                />
              )}
              {isTemplate && (
                <IconButton
                  icon="circle-outline"
                  iconColor={theme.colors.disabled}
                  size={24}
                  disabled
                  style={styles.statusButton}
                />
              )}
            </View>
          </View>

          {/* Description */}
          {task.description && (
            <Text
              variant="bodySmall"
              style={[
                styles.description,
                { color: theme.colors.onSurfaceVariant },
              ]}
              numberOfLines={2}
            >
              {task.description}
            </Text>
          )}

          {/* Meta row: Priority Chip, Category Chip, Deadline Chip */}
          <View style={styles.metaRow}>
            {/* 1. Priority Chip */}
            <Chip
              compact
              style={[
                styles.chip,
                styles.chipSpacing,
                { backgroundColor: priorityColor + '20' },
              ]}
              textStyle={{ fontSize: 11, color: priorityColor }}
            >
              {task.priority}
            </Chip>

            {/* 2. Category Chip */}
            {task.category && (
              <Chip
                compact
                style={[
                  styles.chip,
                  styles.chipSpacing,
                  { backgroundColor: theme.colors.secondaryContainer },
                ]}
                textStyle={{ fontSize: 11 }}
                icon="tag-outline"
              >
                {task.category}
              </Chip>
            )}

            {/* 3. Deadline Chip */}
            {task.deadline && deadlineStatus && (
              <Chip
                compact
                style={[
                  styles.chip,
                  styles.chipSpacing,
                  deadlineStatus.isOverdue
                    ? { backgroundColor: '#FFEEEE' }
                    : deadlineStatus.isToday
                    ? { backgroundColor: theme.colors.primaryContainer }
                    : deadlineStatus.isTomorrow
                    ? { backgroundColor: theme.colors.secondaryContainer }
                    : { backgroundColor: theme.colors.secondaryContainer },
                ]}
                textStyle={{
                  fontSize: 11,
                  color: deadlineStatus.isOverdue 
                    ? '#C40000' 
                    : deadlineStatus.isToday
                    ? theme.colors.onPrimaryContainer
                    : deadlineStatus.isTomorrow
                    ? theme.colors.onSecondaryContainer
                    : theme.colors.onSecondaryContainer,
                }}
                icon="clock-outline"
              >
                {deadlineStatus.label}
              </Chip>
            )}
          </View>

          {/* Offline badge - bottom right, smaller, no layout shift */}
          {(task as any).synced === false && (
            <View style={styles.offlineContainer}>
              <Text variant="labelSmall" style={[styles.offline, { color: theme.colors.error }]}>
                ⚠ Offline
              </Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actions}>
            <IconButton
              icon="pencil"
              iconColor={theme.colors.primary}
              size={20}
              onPress={onEdit}
            />
            <IconButton
              icon="trash-can-outline"
              iconColor={theme.colors.error}
              size={20}
              onPress={onDelete}
            />
          </View>
        </View>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardContent: {
    padding: 14,
    overflow: 'visible',
    alignItems: 'flex-start',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: 8,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
    marginTop: 3,
    alignSelf: 'center',
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontWeight: '600',
    flex: 1,
  },
  pinnedIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  statusButton: {
    margin: 0,
    marginLeft: 4,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  description: {
    marginBottom: 8,
    width: '100%',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    width: '100%',
  },
  chip: {
    // Remove fixed height - let chips size naturally
  },
  chipSpacing: {
    marginRight: 6,
    marginTop: 6,
  },
  offlineContainer: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  offline: {
    fontSize: 10,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 8,
  },
});
