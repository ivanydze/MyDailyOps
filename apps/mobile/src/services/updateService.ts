/**
 * Update Service (Mobile)
 * Problem 20: App Updates
 * 
 * Handles OTA (Over-The-Air) updates using Expo Updates
 */

import * as Updates from 'expo-updates';

/**
 * Check for available updates
 * @returns true if update is available, false otherwise
 */
export async function checkForUpdates(): Promise<boolean> {
  try {
    // Check if updates are enabled
    if (!Updates.isEnabled) {
      console.log('[Update] Updates are disabled (development mode)');
      return false;
    }

    const result = await Updates.checkForUpdateAsync();
    
    if (result.isAvailable) {
      console.log('[Update] Update available:', result.manifest?.id);
      return true;
    }

    console.log('[Update] No updates available');
    return false;
  } catch (error) {
    console.error('[Update] Error checking for updates:', error);
    throw error;
  }
}

/**
 * Download and install the update
 * @returns true if update was installed successfully
 */
export async function installUpdate(): Promise<boolean> {
  try {
    if (!Updates.isEnabled) {
      console.log('[Update] Updates are disabled (development mode)');
      return false;
    }

    const result = await Updates.fetchUpdateAsync();
    
    if (result.isNew) {
      console.log('[Update] New update downloaded:', result.manifest?.id);
      // Reload app to apply update
      await Updates.reloadAsync();
      return true;
    }

    console.log('[Update] No new update to install');
    return false;
  } catch (error) {
    console.error('[Update] Error installing update:', error);
    throw error;
  }
}

/**
 * Get current update ID
 */
export async function getCurrentUpdateId(): Promise<string | null> {
  try {
    const update = await Updates.getUpdateAsync();
    return update?.manifest?.id || null;
  } catch (error) {
    console.error('[Update] Error getting update ID:', error);
    return null;
  }
}

/**
 * Check if running on a downloaded update
 */
export function isRunningOnUpdate(): boolean {
  return Updates.isEnabled && Updates.updateId !== null;
}


