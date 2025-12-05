#!/usr/bin/env python3
"""
Script to fix MyDailyOps mobile app issues:
1. Fix AuthContext to provide session, userId, isAuthenticated
2. Improve DateTimePicker UI in add.tsx and edit.tsx
"""

import os

os.chdir('mobile')

# ============================================
# FIX 1: AuthContext.tsx
# ============================================
auth_context_new = '''import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

type AuthContextType = {
  user: string | null;
  session: any | null;
  userId: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  userId: null,
  isAuthenticated: false,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load saved user on startup
  useEffect(() => {
    const loadUser = async () => {
      try {
        const savedUser = await SecureStore.getItemAsync('user');
        if (savedUser) {
          setUser(savedUser);
        }
      } catch (err) {
        console.error('[AuthContext] Error loading user:', err);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = async (username: string) => {
    try {
      await SecureStore.setItemAsync('user', username);
      setUser(username);
    } catch (err) {
      console.error('[AuthContext] Error saving user:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('user');
      setUser(null);
    } catch (err) {
      console.error('[AuthContext] Error deleting user:', err);
    }
  };

  // Derived values for useSync compatibility
  const userId = user;
  const isAuthenticated = !!user;
  const session = user ? { user: { id: user } } : null;

  return (
    <AuthContext.Provider value={{ user, session, userId, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
'''

with open('contexts/AuthContext.tsx', 'w', encoding='utf-8') as f:
    f.write(auth_context_new)
print("✅ Fixed contexts/AuthContext.tsx")

# ============================================
# FIX 2: tasks/add.tsx - Better DateTimePicker with time support
# ============================================
add_task_new = '''import { useState } from 'react';
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
'''

with open('app/tasks/add.tsx', 'w', encoding='utf-8') as f:
    f.write(add_task_new)
print("✅ Fixed app/tasks/add.tsx")

# ============================================
# FIX 3: tasks/edit.tsx - Better DateTimePicker with time support
# ============================================
edit_task_new = '''import { useState, useEffect } from 'react';
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
'''

with open('app/tasks/edit.tsx', 'w', encoding='utf-8') as f:
    f.write(edit_task_new)
print("✅ Fixed app/tasks/edit.tsx")

print("")
print("=" * 50)
print("All fixes applied successfully!")
print("=" * 50)


