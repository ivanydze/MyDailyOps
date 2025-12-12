/**
 * User Profile Component (Mobile)
 * Displays user initials in a circular avatar
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { getUserInitials, getUserColor, getUserDisplayName } from '../utils/userProfile';
import ProfileModal from './ProfileModal';

interface UserProfileProps {
  size?: "sm" | "md" | "lg";
  showName?: boolean;
}

export default function UserProfile({ size = "md", showName = false }: UserProfileProps) {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!user) {
    return null;
  }

  const email = user.email || undefined;
  const name = user.user_metadata?.name || user.user_metadata?.full_name;
  const initials = getUserInitials(email || name);
  const color = getUserColor(email || user.id);
  const displayName = getUserDisplayName(email, name);

  const sizeStyles = {
    sm: { width: 32, height: 32, fontSize: 12 },
    md: { width: 40, height: 40, fontSize: 14 },
    lg: { width: 48, height: 48, fontSize: 16 },
  };

  const sizeStyle = sizeStyles[size];

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsModalOpen(true)}
        style={styles.container}
        activeOpacity={0.7}
        accessibilityLabel="User profile"
      >
        <View
          style={[
            styles.avatar,
            sizeStyle,
            { backgroundColor: color },
          ]}
        >
          <Text style={[styles.initials, { fontSize: sizeStyle.fontSize }]}>
            {initials}
          </Text>
        </View>
        {showName && (
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
        )}
      </TouchableOpacity>

      {isModalOpen && (
        <ProfileModal
          user={user}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151', // gray-700
  },
});

