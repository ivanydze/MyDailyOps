import { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Appbar, TextInput, Button, Menu, useTheme, Snackbar, Text, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSync } from '../../hooks/useSync';
import { TaskPriority } from '../../types/task';
import DateTimePicker from '@react-native-community/datetimepicker';

/**
 * Add new task screen with full date & time picker
 */
export default function AddTaskScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { addTask } = useSync();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [deadline, setDeadline] = useState<Date | null>(null);
  
  // Date/Time picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [priorityMenuVisible, setPriorityMenuVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const categories = ['General', 'Work', 'Personal', 'Shopping', 'Health', 'Finance', 'Other'];
  const priorities: TaskPriority[] = ['high', 'medium', 'low'];

  const formatDeadline = (date: Date | null): string => {
    if (!date) return '';
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} ${timeStr}`;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'dismissed') return;
    
    if (selectedDate) {
      setTempDate(selectedDate);
      // Show time picker after date is selected
      setTimeout(() => setShowTimePicker(true), 100);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (event.type === 'dismissed') return;
    
    if (selectedTime) {
      // Combine date and time
      const combined = new Date(tempDate);
      combined.setHours(selectedTime.getHours());
      combined.setMinutes(selectedTime.getMinutes());
      setDeadline(combined);
    }
  };

  const openDatePicker = () => {
    setTempDate(deadline || new Date());
    setShowDatePicker(true);
  };

  const clearDeadline = () => {
    setDeadline(null);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setSaving(true);
      setError('');

      await addTask({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        deadline: deadline?.toISOString() || null,
        status: 'pending',
        pinned: false,
      });

      router.back();
    } catch (err: any) {
      console.error('[AddTask] Error:', err);
      setError('Failed to save task. Please try again.');
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Add Task" />
        <Appbar.Action icon="check" onPress={handleSave} disabled={saving} />
      </Appbar.Header>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <TextInput
            label="Title *"
            value={title}
            onChangeText={setTitle}
            mode="outlined"
            style={styles.input}
            disabled={saving}
            placeholder="What needs to be done?"
          />

          <TextInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            multiline
            numberOfLines={4}
            style={styles.input}
            disabled={saving}
            placeholder="Additional details..."
          />

          <Menu
            visible={categoryMenuVisible}
            onDismiss={() => setCategoryMenuVisible(false)}
            anchor={
              <TextInput
                label="Category"
                value={category}
                mode="outlined"
                editable={false}
                right={<TextInput.Icon icon="chevron-down" onPress={() => setCategoryMenuVisible(true)} />}
                style={styles.input}
              />
            }
          >
            {categories.map((cat) => (
              <Menu.Item
                key={cat}
                onPress={() => {
                  setCategory(cat);
                  setCategoryMenuVisible(false);
                }}
                title={cat}
              />
            ))}
          </Menu>

          <Menu
            visible={priorityMenuVisible}
            onDismiss={() => setPriorityMenuVisible(false)}
            anchor={
              <TextInput
                label="Priority"
                value={priority}
                mode="outlined"
                editable={false}
                right={<TextInput.Icon icon="chevron-down" onPress={() => setPriorityMenuVisible(true)} />}
                style={styles.input}
              />
            }
          >
            {priorities.map((pri) => (
              <Menu.Item
                key={pri}
                onPress={() => {
                  setPriority(pri);
                  setPriorityMenuVisible(false);
                }}
                title={pri.charAt(0).toUpperCase() + pri.slice(1)}
              />
            ))}
          </Menu>

          {/* Deadline with Date & Time Picker */}
          <Surface style={[styles.deadlineContainer, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
              Deadline
            </Text>
            <View style={styles.deadlineRow}>
              <TouchableOpacity 
                style={[styles.deadlineButton, { borderColor: theme.colors.outline }]} 
                onPress={openDatePicker}
              >
                <Text style={{ color: deadline ? theme.colors.onSurface : theme.colors.onSurfaceVariant }}>
                  {deadline ? formatDeadline(deadline) : 'Set date & time'}
                </Text>
              </TouchableOpacity>
              {deadline && (
                <Button mode="text" onPress={clearDeadline} compact>
                  Clear
                </Button>
              )}
            </View>
          </Surface>

          {showDatePicker && (
            <DateTimePicker
              value={tempDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={tempDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
            />
          )}

          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={styles.saveButton}
            contentStyle={styles.saveButtonContent}
          >
            Save Task
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={4000}
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
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
  },
  deadlineContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deadlineButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderRadius: 4,
    marginRight: 8,
  },
  saveButton: {
    marginTop: 24,
  },
  saveButtonContent: {
    paddingVertical: 8,
  },
});
