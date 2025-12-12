/**
 * Profile Modal Component (Mobile)
 * Displays user profile information and allows logout
 */

import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, useColorScheme } from 'react-native';
import { User } from '@supabase/supabase-js';
import { useAuth } from '../contexts/AuthContext';
import { getUserInitials, getUserColor, getUserDisplayName } from '../utils/userProfile';
import { useRouter } from 'expo-router';

interface ProfileModalProps {
  user: User;
  onClose: () => void;
}

export default function ProfileModal({ user, onClose }: ProfileModalProps) {
  const { logout } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const email = user.email || undefined;
  const name = user.user_metadata?.name || user.user_metadata?.full_name;
  const initials = getUserInitials(email || name);
  const color = getUserColor(email || user.id);
  const displayName = getUserDisplayName(email, name);

  const dynamicStyles = {
    modal: {
      backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
    },
    headerTitle: {
      color: isDark ? '#FFFFFF' : '#111827',
    },
    closeButtonText: {
      color: isDark ? '#9CA3AF' : '#9CA3AF',
    },
    displayName: {
      color: isDark ? '#FFFFFF' : '#111827',
    },
    email: {
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    infoValue: {
      color: isDark ? '#FFFFFF' : '#111827',
    },
    borderColor: isDark ? '#374151' : '#E5E7EB',
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: dynamicStyles.modal.backgroundColor }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: dynamicStyles.borderColor }]}>
            <Text style={[styles.headerTitle, { color: dynamicStyles.headerTitle.color }]}>Profile</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel="Close"
            >
              <Text style={[styles.closeButtonText, { color: dynamicStyles.closeButtonText.color }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content}>
            {/* Avatar */}
            <View style={styles.avatarSection}>
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: color },
                ]}
              >
                <Text style={styles.avatarInitials}>
                  {initials}
                </Text>
              </View>
              <Text style={[styles.displayName, { color: dynamicStyles.displayName.color }]}>
                {displayName}
              </Text>
              {email && (
                <Text style={[styles.email, { color: dynamicStyles.email.color }]}>
                  {email}
                </Text>
              )}
            </View>

            {/* User Info */}
            <View style={styles.infoSection}>
              {email && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={[styles.infoValue, { color: dynamicStyles.infoValue.color }]}>{email}</Text>
                </View>
              )}
              {name && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={[styles.infoValue, { color: dynamicStyles.infoValue.color }]}>{name}</Text>
                </View>
              )}
            </View>

            {/* Actions */}
            <View style={[styles.actionsSection, { borderTopColor: dynamicStyles.borderColor }]}>
              <TouchableOpacity
                onPress={handleLogout}
                disabled={isLoggingOut}
                style={[
                  styles.logoutButton,
                  isLoggingOut && styles.logoutButtonDisabled,
                ]}
              >
                {isLoggingOut ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.logoutButtonText}>Sign Out</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    maxWidth: 400,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#9CA3AF',
    fontWeight: '300',
  },
  content: {
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarInitials: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  displayName: {
    fontSize: 18,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoSection: {
    marginBottom: 24,
  },
  infoRow: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
  },
  actionsSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 20,
  },
  logoutButton: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonDisabled: {
    backgroundColor: '#F87171',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

