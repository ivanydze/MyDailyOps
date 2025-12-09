import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Banner, useTheme } from 'react-native-paper';
import { TaskFilter } from '../types/task';

interface FilterBannerProps {
  filter: TaskFilter;
  visible: boolean;
  onDismiss: () => void;
}

const filterLabels: Record<TaskFilter, string> = {
  all: 'All Tasks',
  today: 'Today',
  tomorrow: 'Tomorrow',
  this_week: 'This Week',
  overdue: 'Overdue',
  done: 'Completed',
};

export function FilterBanner({ filter, visible, onDismiss }: FilterBannerProps) {
  const theme = useTheme();

  if (!visible || filter === 'all') {
    return null;
  }

  return (
    <Banner
      visible={visible}
      actions={[
        {
          label: 'Clear',
          onPress: onDismiss,
        },
      ]}
      icon="filter-variant"
      style={[styles.banner, { backgroundColor: theme.colors.primaryContainer }]}
    >
      Filtering: {filterLabels[filter]}
    </Banner>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
});

