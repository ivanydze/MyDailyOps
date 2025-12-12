/**
 * User Profile Utilities
 * Functions for generating user initials and profile colors
 */

/**
 * Generate user initials from email or name
 * Examples:
 * - "john.doe@example.com" → "JD"
 * - "John Doe" → "JD"
 * - "john" → "J"
 */
export function getUserInitials(emailOrName: string | null | undefined): string {
  if (!emailOrName) return "?";

  // Remove email domain if present
  const localPart = emailOrName.split("@")[0];

  // Split by common separators
  const parts = localPart.split(/[.\s_-]+/).filter(Boolean);

  if (parts.length === 0) return "?";

  if (parts.length === 1) {
    // Single word: take first letter
    return parts[0].charAt(0).toUpperCase();
  }

  // Multiple words: take first letter of first two words
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

/**
 * Generate a consistent color for a user based on their identifier
 * Uses a simple hash function to map identifier to color
 */
export function getUserColor(identifier: string | null | undefined): string {
  if (!identifier) return "#6B7280"; // Default gray

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Map hash to HSL hue (0-360) with good saturation and lightness
  const hue = Math.abs(hash) % 360;
  const saturation = 60 + (Math.abs(hash) % 20); // 60-80%
  const lightness = 45 + (Math.abs(hash) % 15); // 45-60%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Predefined profile colors (optional fallback)
 */
export const PROFILE_COLORS = [
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#EF4444", // Red
  "#6366F1", // Indigo
  "#14B8A6", // Teal
] as const;

/**
 * Get display name from user (email or name)
 */
export function getUserDisplayName(email: string | null | undefined, name?: string | null): string {
  if (name) return name;
  if (email) return email.split("@")[0];
  return "User";
}

