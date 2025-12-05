import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Card, Text, IconButton, useTheme, Chip } from 'react-native-paper';
import { Task } from '../types/task';
import { priorityColors, statusColors } from '../lib/theme';

interface TaskCardProps {
  task: Task;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleStatus?: () => void;
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

  return (
    <Card
      mode="elevated"
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface },
        task.pinned && { borderColor: theme.colors.primary, borderWidth: 2 },
      ]}
    >
      <Pressable onPress={onPress}>
        <View style={styles.cardContent}>
          {/* Priority indicator */}
          <View
            style={[styles.priorityBar, { backgroundColor: priorityColor }]}
          />

          {/* Status button */}
          <IconButton
            icon={statusIcon}
            iconColor={statusColor}
            size={24}
            onPress={onToggleStatus}
            style={styles.statusButton}
          />

          {/* Task details */}
          <View style={styles.detailsContainer}>
            <Text
              variant="titleMedium"
              style={[
                styles.title,
                { color: theme.colors.onSurface },
                task.status === 'done' && styles.strikethrough,
              ]}
              numberOfLines={1}
            >
              {task.title}
            </Text>

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

            <View style={styles.metaRow}>
              <Chip
                compact
                style={[styles.chip, { backgroundColor: theme.colors.secondaryContainer }]}
                textStyle={{ fontSize: 11 }}
              >
                {task.category}
              </Chip>

              <Chip
                compact
                style={[styles.chip, { backgroundColor: priorityColor + '20' }]}
                textStyle={{ fontSize: 11, color: priorityColor }}
              >
                {task.priority}
              </Chip>

              {task.deadline && (
                <Text
                  variant="labelSmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  📅 {new Date(task.deadline).toLocaleDateString()}
                </Text>
              )}

              {!task.synced && (
                <Text variant="labelSmall" style={{ color: theme.colors.error }}>
                  ⚠️ Offline
                </Text>
              )}
            </View>
          </View>

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
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  priorityBar: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 8,
  },
  statusButton: {
    margin: 0,
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 8,
  },
  title: {
    fontWeight: '600',
    marginBottom: 4,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  description: {
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    height: 24,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

