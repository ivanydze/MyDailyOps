/**
 * Checklist Item Component (Mobile)
 * Problem 10: Weekly Checklists
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Checkbox, IconButton, useTheme } from 'react-native-paper';
import type { ChecklistItem as ChecklistItemType } from '../../types/weeklyChecklist';

interface ChecklistItemProps {
  item: ChecklistItemType;
  onToggle: () => void;
  onUpdate: (text: string) => void;
  onDelete: () => void;
  isReadonly?: boolean;
}

export function ChecklistItem({
  item,
  onToggle,
  onUpdate,
  onDelete,
  isReadonly = false,
}: ChecklistItemProps) {
  const theme = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);

  const handleSave = () => {
    if (editText.trim()) {
      onUpdate(editText.trim());
      setIsEditing(false);
    } else {
      // If empty, delete instead
      onDelete();
    }
  };

  const handleCancel = () => {
    setEditText(item.text);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <View style={[styles.editContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
        <TextInput
          value={editText}
          onChangeText={setEditText}
          onSubmitEditing={handleSave}
          onBlur={handleSave}
          autoFocus
          style={[styles.editInput, { color: theme.colors.onSurface }]}
          placeholderTextColor={theme.colors.onSurfaceVariant}
        />
        <IconButton
          icon="check"
          iconColor={theme.colors.primary}
          size={20}
          onPress={handleSave}
        />
        <IconButton
          icon="close"
          iconColor={theme.colors.error}
          size={20}
          onPress={handleCancel}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: item.completed
            ? theme.colors.surfaceVariant
            : theme.colors.surface,
        },
      ]}
    >
      <Checkbox
        status={item.completed ? 'checked' : 'unchecked'}
        onPress={onToggle}
        disabled={isReadonly}
        color={theme.colors.primary}
      />

      <Text
        style={[
          styles.text,
          {
            color: item.completed
              ? theme.colors.onSurfaceVariant
              : theme.colors.onSurface,
            textDecorationLine: item.completed ? 'line-through' : 'none',
          },
        ]}
      >
        {item.text}
      </Text>

      {!isReadonly && (
        <View style={styles.actions}>
          <IconButton
            icon="pencil"
            iconColor={theme.colors.onSurfaceVariant}
            size={18}
            onPress={() => setIsEditing(true)}
          />
          <IconButton
            icon="delete"
            iconColor={theme.colors.error}
            size={18}
            onPress={onDelete}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  text: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
  },
  actions: {
    flexDirection: 'row',
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  editInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
});

