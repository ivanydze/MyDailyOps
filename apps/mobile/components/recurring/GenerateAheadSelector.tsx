import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, TextInput, HelperText, useTheme } from 'react-native-paper';

export interface GenerateAheadValue {
  generate_unit: 'days' | 'weeks' | 'months';
  generate_value: number;
  custom: boolean;
}

interface GenerateAheadSelectorProps {
  recurringType: 'daily' | 'weekly' | 'monthly_date' | 'monthly_weekday' | 'interval';
  value: GenerateAheadValue;
  onChange: (newValue: GenerateAheadValue) => void;
}

/**
 * Component for selecting how far ahead to generate recurring tasks
 */
export default function GenerateAheadSelector({
  recurringType,
  value,
  onChange,
}: GenerateAheadSelectorProps) {
  const theme = useTheme();

  // Define presets based on recurring type
  const getPresets = () => {
    switch (recurringType) {
      case 'daily':
        return [
          { label: '7d', value: 7, unit: 'days' as const },
          { label: '14d', value: 14, unit: 'days' as const },
          { label: '30d', value: 30, unit: 'days' as const },
          { label: 'Custom', value: -1, unit: 'days' as const },
        ];
      case 'weekly':
        return [
          { label: '4w', value: 4, unit: 'weeks' as const },
          { label: '8w', value: 8, unit: 'weeks' as const },
          { label: '12w', value: 12, unit: 'weeks' as const },
          { label: 'Custom', value: -1, unit: 'weeks' as const },
        ];
      case 'monthly_date':
      case 'monthly_weekday':
        return [
          { label: '3m', value: 3, unit: 'months' as const },
          { label: '6m', value: 6, unit: 'months' as const },
          { label: '12m', value: 12, unit: 'months' as const },
          { label: 'Custom', value: -1, unit: 'months' as const },
        ];
      case 'interval':
        // Interval only has Custom
        return [{ label: 'Custom', value: -1, unit: 'days' as const }];
      default:
        return [];
    }
  };

  const presets = getPresets();
  const isCustom = value.custom;
  const customValueString = isCustom ? value.generate_value.toString() : '';

  const handlePresetSelect = (preset: typeof presets[0]) => {
    if (preset.value === -1) {
      // Custom selected
      onChange({
        generate_unit: preset.unit,
        generate_value: value.generate_value || 1,
        custom: true,
      });
    } else {
      // Preset selected
      onChange({
        generate_unit: preset.unit,
        generate_value: preset.value,
        custom: false,
      });
    }
  };

  const handleCustomValueChange = (text: string) => {
    const num = parseInt(text, 10);
    if (text === '' || (!isNaN(num) && num >= 1)) {
      onChange({
        generate_unit: value.generate_unit,
        generate_value: num || 1,
        custom: true,
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
        Generate Ahead
      </Text>

      {/* Preset buttons */}
      <View style={styles.buttonRow}>
        {presets.map((preset, index) => {
          const isSelected =
            !isCustom &&
            preset.value !== -1 &&
            value.generate_unit === preset.unit &&
            value.generate_value === preset.value;

          const isCustomSelected = isCustom && preset.value === -1;

          return (
            <Button
              key={index}
              mode={isSelected || isCustomSelected ? 'contained' : 'outlined'}
              onPress={() => handlePresetSelect(preset)}
              style={[
                styles.button,
                { marginRight: index < presets.length - 1 ? 8 : 0 },
              ]}
              compact
            >
              {preset.label}
            </Button>
          );
        })}
      </View>

      {/* Custom input */}
      {isCustom && (
        <View style={styles.customInput}>
          <TextInput
            label={`Number of ${value.generate_unit}`}
            value={customValueString}
            onChangeText={handleCustomValueChange}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
          />
          <HelperText type="info">
            Enter how many {value.generate_unit} ahead to generate tasks
          </HelperText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  button: {
    flex: 1,
    minWidth: 80,
  },
  customInput: {
    marginTop: 8,
  },
  input: {
    marginBottom: 4,
  },
});

