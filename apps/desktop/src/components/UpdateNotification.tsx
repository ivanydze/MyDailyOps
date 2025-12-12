/**
 * Update Notification Component
 * Problem 20: App Updates
 * 
 * Shows notification when an update is available
 */

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { checkForUpdates, installUpdate } from '../services/updateService';
import toast from 'react-hot-toast';

interface UpdateInfo {
  version: string;
  body?: string;
  available: boolean;
}

interface UpdateNotificationProps {
  onDismiss?: () => void;
}

export default function UpdateNotification({ onDismiss }: UpdateNotificationProps) {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check for updates on mount
    handleCheckForUpdates();
  }, []);

  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    try {
      const availableUpdate = await checkForUpdates();
      if (availableUpdate) {
        setUpdate(availableUpdate);
        toast.success(`Update ${availableUpdate.version} available!`);
      } else {
        toast.success('You are on the latest version');
      }
    } catch (error: any) {
      console.error('[UpdateNotification] Error checking updates:', error);
      toast.error('Failed to check for updates');
    } finally {
      setIsChecking(false);
    }
  };

  const handleInstallUpdate = async () => {
    if (!update) return;

    setIsInstalling(true);
    try {
      await installUpdate(update);
      toast.success('Update installed! Restarting app...');
      // App will restart automatically
    } catch (error: any) {
      console.error('[UpdateNotification] Error installing update:', error);
      toast.error('Failed to install update');
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setUpdate(null);
    onDismiss?.();
  };

  if (!update) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md w-full">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Update Available
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Version {update.version} is available
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            disabled={isInstalling || isChecking}
          >
            <X size={18} />
          </button>
        </div>

        {update.body && (
          <div className="mb-3 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 rounded p-2 max-h-32 overflow-y-auto">
            <pre className="whitespace-pre-wrap font-sans">{update.body}</pre>
          </div>
        )}

        {isInstalling && (
          <div className="mb-3">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 animate-pulse"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
              Installing update...
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleInstallUpdate}
            disabled={isInstalling}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isInstalling ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Installing...
              </>
            ) : (
              <>
                <Download size={16} />
                Install Update
              </>
            )}
          </button>
          <button
            onClick={handleDismiss}
            disabled={isInstalling}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}

