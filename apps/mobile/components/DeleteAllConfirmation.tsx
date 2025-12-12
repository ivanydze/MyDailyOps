/**
 * Delete All Tasks Confirmation Modal (Mobile)
 * Problem 13: Double confirmation with typing "DELETE"
 */

import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Modal, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Dialog, Portal, Button, useTheme } from 'react-native-paper';

interface DeleteAllConfirmationProps {
  visible: boolean;
  taskCount: number;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  requirePin?: boolean;
  onPinVerify?: (pin: string) => Promise<boolean>;
}

export default function DeleteAllConfirmation({
  visible,
  taskCount,
  onConfirm,
  onCancel,
  requirePin = false,
  onPinVerify,
}: DeleteAllConfirmationProps) {
  const theme = useTheme();
  const [confirmationText, setConfirmationText] = useState('');
  const [pin, setPin] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canConfirm = confirmationText === 'DELETE' && (!requirePin || pin.length > 0);

  const handleConfirm = async () => {
    if (!canConfirm) return;

    setIsDeleting(true);
    setError(null);

    try {
      // Verify PIN if required
      if (requirePin && onPinVerify) {
        const isValid = await onPinVerify(pin);
        if (!isValid) {
          setError('Invalid PIN. Please try again.');
          setIsDeleting(false);
          return;
        }
      }

      await onConfirm();
      
      // Reset form
      setConfirmationText('');
      setPin('');
      setError(null);
      setIsDeleting(false);
    } catch (err: any) {
      setError(err.message || 'Failed to delete tasks. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setConfirmationText('');
    setPin('');
    setError(null);
    setIsDeleting(false);
    onCancel();
  };

  return (
    <Portal>
      <Dialog 
        visible={visible} 
        onDismiss={handleCancel}
        style={[styles.dialog, { backgroundColor: theme.colors.surface }]}
      >
        <Dialog.Title style={{ color: theme.colors.error }}>
          ⚠️ Delete All Tasks
        </Dialog.Title>
        
        <Dialog.Content>
          <View style={styles.content}>
            <Text variant="bodyMedium" style={[styles.warningText, { color: theme.colors.onSurface }]}>
              Warning: This action cannot be undone!
            </Text>
            <Text variant="bodySmall" style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
              This will move <Text style={{ fontWeight: '600' }}>{taskCount} task{taskCount !== 1 ? 's' : ''}</Text> to Trash.
              You can restore them from Trash within 30 days.
            </Text>

            {error && (
              <View style={[styles.errorBox, { backgroundColor: theme.colors.errorContainer, borderColor: theme.colors.error }]}>
                <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer }}>
                  {error}
                </Text>
              </View>
            )}

            <View style={styles.inputSection}>
              <Text variant="labelMedium" style={[styles.inputLabel, { color: theme.colors.onSurface }]}>
                Type <Text style={{ fontFamily: 'monospace', fontWeight: '600', color: theme.colors.error }}>DELETE</Text> to confirm:
              </Text>
              <TextInput
                value={confirmationText}
                onChangeText={setConfirmationText}
                placeholder="DELETE"
                placeholderTextColor={theme.colors.onSurfaceDisabled}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    color: theme.colors.onSurface,
                    borderColor: theme.colors.outline,
                  },
                  confirmationText === 'DELETE' && {
                    borderColor: theme.colors.error,
                    borderWidth: 2,
                  },
                ]}
                editable={!isDeleting}
                autoCapitalize="characters"
                autoFocus
              />
            </View>

            {requirePin && (
              <View style={styles.inputSection}>
                <Text variant="labelMedium" style={[styles.inputLabel, { color: theme.colors.onSurface }]}>
                  Enter your PIN:
                </Text>
                <TextInput
                  value={pin}
                  onChangeText={setPin}
                  placeholder="••••"
                  placeholderTextColor={theme.colors.onSurfaceDisabled}
                  secureTextEntry
                  maxLength={8}
                  keyboardType="numeric"
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                      color: theme.colors.onSurface,
                      borderColor: theme.colors.outline,
                    },
                  ]}
                  editable={!isDeleting}
                />
              </View>
            )}
          </View>
        </Dialog.Content>

        <Dialog.Actions>
          <Button onPress={handleCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onPress={handleConfirm}
            disabled={!canConfirm || isDeleting}
            textColor={theme.colors.error}
            loading={isDeleting}
          >
            Delete All
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    maxWidth: 400,
  },
  content: {
    gap: 16,
  },
  warningText: {
    fontWeight: '600',
  },
  description: {
    marginTop: 4,
  },
  errorBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  inputSection: {
    marginTop: 8,
  },
  inputLabel: {
    marginBottom: 8,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    fontFamily: 'monospace',
  },
});

