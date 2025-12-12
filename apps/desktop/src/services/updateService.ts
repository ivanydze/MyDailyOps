/**
 * Update Service
 * Problem 20: App Updates
 * 
 * Handles checking for and applying updates using Tauri Updater API
 * 
 * Note: This service requires proper Tauri Updater plugin setup.
 * The updater endpoint must be configured in tauri.conf.json.
 * 
 * For now, this uses custom Tauri commands as a fallback until
 * the updater plugin is fully configured with signing keys.
 */

import { invoke } from '@tauri-apps/api/core';

export interface UpdateInfo {
  version: string;
  body?: string;
  available: boolean;
}

/**
 * Check for available updates using Tauri Updater
 * @returns UpdateInfo object if available, null otherwise
 */
export async function checkForUpdates(): Promise<UpdateInfo | null> {
  try {
    // Try to use Tauri Updater plugin API first
    // If not available, fall back to custom command
    try {
      // Dynamic import to avoid errors if plugin not available
      // @ts-ignore - module may not be available at build time
      const updaterModule = await import('@tauri-apps/plugin-updater');
      const update = await updaterModule.check({
        onEvent: (event: any) => {
          console.log('[Update] Event:', event);
        },
      });

      if (update?.available) {
        console.log('[Update] Update available:', update.version);
        return {
          version: update.version,
          body: update.body,
          available: true,
        };
      }

      console.log('[Update] No updates available');
      return null;
    } catch (pluginError: any) {
      // Fall back to custom command if plugin API not available
      console.log('[Update] Using fallback command');
      const result = await invoke<{ available: boolean; version?: string; body?: string }>('check_for_updates');
      
      if (result.available && result.version) {
        console.log('[Update] Update available:', result.version);
        return {
          version: result.version,
          body: result.body,
          available: true,
        };
      }

      console.log('[Update] No updates available');
      return null;
    }
  } catch (error: any) {
    // If updater is not configured, return null gracefully
    if (error.message?.includes('updater') || error.message?.includes('not configured')) {
      console.warn('[Update] Updater not configured:', error.message);
      return null;
    }
    console.error('[Update] Error checking for updates:', error);
    throw error;
  }
}

/**
 * Download and install the update
 * @param update UpdateInfo object from checkForUpdates()
 */
export async function installUpdate(update: UpdateInfo): Promise<void> {
  try {
    // Try to use Tauri Updater plugin API first
    try {
      // @ts-ignore - module may not be available at build time
      const updaterModule = await import('@tauri-apps/plugin-updater');
      const updater = await updaterModule.check();
      
      if (updater && updater.available) {
        await updater.downloadAndInstall((progress: any) => {
          console.log('[Update] Download progress:', progress);
        });
        console.log('[Update] Update installed successfully');
        // App will restart automatically
        return;
      }
    } catch (pluginError) {
      // Fall back to custom command
      console.log('[Update] Using fallback install command');
      await invoke('install_update', { version: update.version });
      console.log('[Update] Update installation started');
    }
  } catch (error) {
    console.error('[Update] Error installing update:', error);
    throw error;
  }
}

/**
 * Get current app version
 */
export async function getAppVersion(): Promise<string> {
  try {
    const version = await invoke<string>('get_app_version');
    return version;
  } catch (error) {
    // Fallback to package.json version if command not available
    console.warn('[Update] Error getting version, using fallback');
    return '0.1.0';
  }
}

