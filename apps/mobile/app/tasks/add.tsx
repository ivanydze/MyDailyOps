import { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Appbar, TextInput, Button, Menu, useTheme, Snackbar, Text, Surface, Switch, RadioButton, HelperText, Checkbox } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSync } from '../../hooks/useSync';
import { TaskPriority, RecurringOptions } from '../../types/task';
import DateTimePicker from '@react-native-community/datetimepicker';
import GenerateAheadSelector, { GenerateAheadValue } from '../../components/recurring/GenerateAheadSelector';
import { getTransparentBackground } from '../../lib/theme';

/**
 * Add new task screen with full date & time picker and new recurring JSON structure
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

  // Recurring task state - using new JSON structure
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState<RecurringOptions['type']>('none');
  const [intervalDays, setIntervalDays] = useState<string>('');
  const [selectedWeekdays, setSelectedWeekdays] = useState<RecurringOptions['weekdays']>([]);
  const [dayOfMonth, setDayOfMonth] = useState<string>('');
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [generateAhead, setGenerateAhead] = useState<GenerateAheadValue>({
    generate_unit: 'days',
    generate_value: 7,
    custom: false,
  });

  const categories = ['General', 'Work', 'Personal', 'Shopping', 'Health', 'Finance', 'Other'];
  const priorities: TaskPriority[] = ['high', 'medium', 'low'];
  
  const weekdayOptions: { value: RecurringOptions['weekdays'][0]; label: string }[] = [
    { value: 'sun', label: 'Sunday' },
    { value: 'mon', label: 'Monday' },
    { value: 'tue', label: 'Tuesday' },
    { value: 'wed', label: 'Wednesday' },
    { value: 'thu', label: 'Thursday' },
    { value: 'fri', label: 'Friday' },
    { value: 'sat', label: 'Saturday' },
  ];

  const weekNumberOptions = [
    { value: 1, label: '1st' },
    { value: 2, label: '2nd' },
    { value: 3, label: '3rd' },
    { value: 4, label: '4th' },
    { value: -1, label: 'Last' },
  ];

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
      setTimeout(() => setShowTimePicker(true), 100);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (event.type === 'dismissed') return;
    
    if (selectedTime) {
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

  const toggleWeekday = (weekday: RecurringOptions['weekdays'][0]) => {
    setSelectedWeekdays(prev => {
      if (prev.includes(weekday)) {
        return prev.filter(w => w !== weekday);
      } else {
        return [...prev, weekday];
      }
    });
  };

  const buildRecurringOptions = (): RecurringOptions | null => {
    if (!isRecurring || recurringType === 'none') {
      return null;
    }

    const base: RecurringOptions = { type: recurringType };

    switch (recurringType) {
      case 'daily':
        return { 
          type: 'daily',
          generate_unit: generateAhead.generate_unit,
          generate_value: generateAhead.generate_value,
          custom: generateAhead.custom,
        };
      
      case 'interval':
        const days = parseInt(intervalDays, 10);
        if (!days || days < 1) return null;
        return { 
          type: 'interval', 
          interval_days: days,
          generate_unit: generateAhead.generate_unit,
          generate_value: generateAhead.generate_value,
          custom: generateAhead.custom,
        };
      
      case 'weekly':
        if (selectedWeekdays.length === 0) return null;
        return { 
          type: 'weekly', 
          weekdays: [...selectedWeekdays],
          generate_unit: generateAhead.generate_unit,
          generate_value: generateAhead.generate_value,
          custom: generateAhead.custom,
        };
      
      case 'monthly_date':
        const day = parseInt(dayOfMonth, 10);
        if (!day || day < 1 || day > 31) return null;
        return { 
          type: 'monthly_date', 
          dayOfMonth: day,
          generate_unit: generateAhead.generate_unit,
          generate_value: generateAhead.generate_value,
          custom: generateAhead.custom,
        };
      
      case 'monthly_weekday':
        if (selectedWeekdays.length === 0) return null;
        return {
          type: 'monthly_weekday',
          weekdays: [selectedWeekdays[0]], // Use first selected
          weekNumber: weekNumber,
          generate_unit: generateAhead.generate_unit,
          generate_value: generateAhead.generate_value,
          custom: generateAhead.custom,
        };
      
      default:
        return null;
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    // Validate recurring options if enabled
    if (isRecurring) {
      const recurringOpts = buildRecurringOptions();
      if (!recurringOpts) {
        setError('Please complete recurring settings');
        return;
      }
    }

    try {
      setSaving(true);
      setError('');

      const recurringOptions = buildRecurringOptions();

      await addTask({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        deadline: deadline?.toISOString() || null,
        status: 'pending',
        pinned: false,
        recurring_options: recurringOptions,
      });

      router.back();
    } catch (err: any) {
      console.error('[AddTask] Error:', err);
      setError('Failed to save task. Please try again.');
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: getTransparentBackground(theme.dark) }]}>
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

          {/* Recurring Section - New JSON Structure */}
          <Surface style={[styles.recurringContainer, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
            <View style={styles.recurringHeader}>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Recurring
              </Text>
              <Switch
                value={isRecurring}
                onValueChange={(value) => {
                  setIsRecurring(value);
                  if (value && recurringType === 'none') {
                    setRecurringType('daily');
                  } else if (!value) {
                    setRecurringType('none');
                  }
                }}
              />
            </View>

            {isRecurring && (
              <View style={styles.recurringContent}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                  Repeat
                </Text>
                <RadioButton.Group
                  onValueChange={(value) => {
                    const newType = value as RecurringOptions['type'];
                    setRecurringType(newType);
                    // Reset dependent fields
                    setIntervalDays('');
                    setSelectedWeekdays([]);
                    setDayOfMonth('');
                    setWeekNumber(1);
                    // Reset generate ahead to default for new type
                    switch (newType) {
                      case 'daily':
                        setGenerateAhead({ generate_unit: 'days', generate_value: 7, custom: false });
                        break;
                      case 'weekly':
                        setGenerateAhead({ generate_unit: 'weeks', generate_value: 4, custom: false });
                        break;
                      case 'monthly_date':
                      case 'monthly_weekday':
                        setGenerateAhead({ generate_unit: 'months', generate_value: 3, custom: false });
                        break;
                      case 'interval':
                        setGenerateAhead({ generate_unit: 'days', generate_value: 7, custom: false });
                        break;
                    }
                  }}
                  value={recurringType}
                >
                  <View style={styles.radioRow}>
                    <RadioButton value="daily" />
                    <Text onPress={() => setRecurringType('daily')} style={styles.radioLabel}>Daily</Text>
                  </View>
                  <View style={styles.radioRow}>
                    <RadioButton value="weekly" />
                    <Text onPress={() => setRecurringType('weekly')} style={styles.radioLabel}>Weekly</Text>
                  </View>
                  <View style={styles.radioRow}>
                    <RadioButton value="monthly_date" />
                    <Text onPress={() => setRecurringType('monthly_date')} style={styles.radioLabel}>Monthly (Date)</Text>
                  </View>
                  <View style={styles.radioRow}>
                    <RadioButton value="monthly_weekday" />
                    <Text onPress={() => setRecurringType('monthly_weekday')} style={styles.radioLabel}>Monthly (Weekday)</Text>
                  </View>
                  <View style={styles.radioRow}>
                    <RadioButton value="interval" />
                    <Text onPress={() => setRecurringType('interval')} style={styles.radioLabel}>Interval</Text>
                  </View>
                </RadioButton.Group>

                {/* Generate Ahead Selector */}
                {isRecurring && recurringType !== 'none' && (
                  <View style={styles.recurringField}>
                    <GenerateAheadSelector
                      recurringType={recurringType}
                      value={generateAhead}
                      onChange={setGenerateAhead}
                    />
                  </View>
                )}

                {/* Interval: Number of days */}
                {recurringType === 'interval' && (
                  <View style={styles.recurringField}>
                    <TextInput
                      label="Repeat every X days"
                      value={intervalDays}
                      onChangeText={(text) => {
                        const num = parseInt(text, 10);
                        if (text === '' || (!isNaN(num) && num >= 1)) {
                          setIntervalDays(text);
                        }
                      }}
                      mode="outlined"
                      keyboardType="numeric"
                      style={styles.input}
                    />
                    <HelperText type="info">Enter number of days between repeats</HelperText>
                  </View>
                )}

                {/* Weekly: Multiple weekdays */}
                {recurringType === 'weekly' && (
                  <View style={styles.recurringField}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                      Select weekdays (multiple allowed)
                    </Text>
                    {weekdayOptions.map((option) => (
                      <View key={option.value} style={styles.checkboxRow}>
                        <Checkbox
                          status={selectedWeekdays.includes(option.value) ? 'checked' : 'unchecked'}
                          onPress={() => toggleWeekday(option.value)}
                        />
                        <Text onPress={() => toggleWeekday(option.value)} style={styles.checkboxLabel}>
                          {option.label}
                        </Text>
                      </View>
                    ))}
                    {selectedWeekdays.length === 0 && (
                      <HelperText type="error">Please select at least one weekday</HelperText>
                    )}
                  </View>
                )}

                {/* Monthly Date: Day of month */}
                {recurringType === 'monthly_date' && (
                  <View style={styles.recurringField}>
                    <TextInput
                      label="Day of month (1-31)"
                      value={dayOfMonth}
                      onChangeText={(text) => {
                        const num = parseInt(text, 10);
                        if (text === '' || (!isNaN(num) && num >= 1 && num <= 31)) {
                          setDayOfMonth(text);
                        }
                      }}
                      mode="outlined"
                      keyboardType="numeric"
                      style={styles.input}
                    />
                    <HelperText type="info">Enter day of month (1-31). Will clamp to last day of month if needed.</HelperText>
                  </View>
                )}

                {/* Monthly Weekday: Weekday + Week number */}
                {recurringType === 'monthly_weekday' && (
                  <View style={styles.recurringField}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                      Select weekday
                    </Text>
                    {weekdayOptions.map((option) => (
                      <View key={option.value} style={styles.checkboxRow}>
                        <RadioButton
                          value={option.value}
                          status={selectedWeekdays[0] === option.value ? 'checked' : 'unchecked'}
                          onPress={() => setSelectedWeekdays([option.value])}
                        />
                        <Text onPress={() => setSelectedWeekdays([option.value])} style={styles.radioLabel}>
                          {option.label}
                        </Text>
                      </View>
                    ))}
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16, marginBottom: 8 }}>
                      Week number
                    </Text>
                    <RadioButton.Group
                      onValueChange={(value) => setWeekNumber(parseInt(value, 10))}
                      value={weekNumber.toString()}
                    >
                      {weekNumberOptions.map((option) => (
                        <View key={option.value} style={styles.radioRow}>
                          <RadioButton value={option.value.toString()} />
                          <Text onPress={() => setWeekNumber(option.value)} style={styles.radioLabel}>
                            {option.label}
                          </Text>
                        </View>
                      ))}
                    </RadioButton.Group>
                    {selectedWeekdays.length === 0 && (
                      <HelperText type="error">Please select a weekday</HelperText>
                    )}
                  </View>
                )}
              </View>
            )}
          </Surface>

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
  recurringContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  recurringHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recurringContent: {
    marginTop: 8,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  radioLabel: {
    marginLeft: 8,
  },
  recurringField: {
    marginTop: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  checkboxLabel: {
    marginLeft: 8,
  },
});
