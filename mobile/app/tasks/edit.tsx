import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Appbar, TextInput, Button, Menu, useTheme, Snackbar, Switch, Text, Surface } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSync } from '../../hooks/useSync';
import { Task, TaskPriority, TaskStatus } from '../../types/task';
import DateTimePicker from '@react-native-community/datetimepicker';

/**
 * Edit existing task screen with full date & time picker
 */
export default function EditTaskScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tasks, updateTask } = useSync();

  const [task, setTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [pinned, setPinned] = useState(false);
  const [deadline, setDeadline] = useState<Date | null>(null);
  
  // Date/Time picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [priorityMenuVisible, setPriorityMenuVisible] = useState(false);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const categories = ['General', 'Work', 'Personal', 'Shopping', 'Health', 'Finance', 'Other'];
  const priorities: TaskPriority[] = ['high', 'medium', 'low'];
  const statuses: TaskStatus[] = ['pending', 'in_progress', 'done'];

  useEffect(() => {
    const currentTask = tasks.find((t) => t.id === id);
    if (currentTask) {
      setTask(currentTask);
      setTitle(currentTask.title);
      setDescription(currentTask.description || '');
      setCategory(currentTask.category || 'General');
      setPriority(currentTask.priority || 'medium');
      setStatus(currentTask.status || 'pending');
      setPinned(currentTask.pinned || false);
      // Parse existing deadline
      if (currentTask.deadline) {
        try {
          setDeadline(new Date(currentTask.deadline));
        } catch (e) {
          console.error('[EditTask] Error parsing deadline:', e);
          setDeadline(null);
        }
      }
    }
  }, [id, tasks]);

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

    if (!task) return;

    try {
      setSaving(true);
      setError('');

      await updateTask({
        ...task,
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        status,
        pinned,
        deadline: deadline?.toISOString() || null,
      });

      router.back();
    } catch (err: any) {
      console.error('[EditTask] Error:', err);
      setError('Failed to save changes. Please try again.');
      setSaving(false);
    }
  };

  if (!task) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Edit Task" />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Edit Task" />
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

          <Menu
            visible={statusMenuVisible}
            onDismiss={() => setStatusMenuVisible(false)}
            anchor={
              <TextInput
                label="Status"
                value={status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                mode="outlined"
                editable={false}
                right={<TextInput.Icon icon="chevron-down" onPress={() => setStatusMenuVisible(true)} />}
                style={styles.input}
              />
            }
          >
            {statuses.map((stat) => (
              <Menu.Item
                key={stat}
                onPress={() => {
                  setStatus(stat);
                  setStatusMenuVisible(false);
                }}
                title={stat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
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

          <View style={styles.switchRow}>
            <Text variant="bodyLarge">Pin to top</Text>
            <Switch value={pinned} onValueChange={setPinned} />
          </View>

          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={styles.saveButton}
            contentStyle={styles.saveButtonContent}
          >
            Save Changes
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 8,
  },
  saveButton: {
    marginTop: 8,
  },
  saveButtonContent: {
    paddingVertical: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
