import React from 'react';
import { FAB as PaperFAB } from 'react-native-paper';
import { StyleSheet } from 'react-native';

interface FABProps {
  icon: string;
  label?: string;
  onPress: () => void;
}

export function FAB({ icon, label, onPress }: FABProps) {
  return (
    <PaperFAB
      icon={icon}
      label={label}
      onPress={onPress}
      style={styles.fab}
    />
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});

