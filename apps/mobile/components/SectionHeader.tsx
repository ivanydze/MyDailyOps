import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface SectionHeaderProps {
  title: string;
  count?: number;
}

/**
 * Section header component for grouped task lists
 */
export function SectionHeader({ title, count }: SectionHeaderProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]}>
      <Text 
        variant="titleMedium" 
        style={[styles.title, { color: theme.colors.onSurfaceVariant }]}
      >
        {title}
        {count !== undefined && ` (${count})`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  title: {
    fontWeight: '600',
  },
});

