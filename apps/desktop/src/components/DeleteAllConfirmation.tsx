/**
 * Delete All Tasks Confirmation Modal
 * Problem 13: Double confirmation with typing "DELETE"
 */

import { useState } from "react";
import { X, AlertTriangle, Trash2 } from "lucide-react";

interface DeleteAllConfirmationProps {
  taskCount: number;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  requirePin?: boolean;
  onPinVerify?: (pin: string) => Promise<boolean>;
}

export default function DeleteAllConfirmation({
  taskCount,
  onConfirm,
  onCancel,
  requirePin = false,
  onPinVerify,
}: DeleteAllConfirmationProps) {
  const [confirmationText, setConfirmationText] = useState("");
  const [pin, setPin] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canConfirm = confirmationText === "DELETE" && (!requirePin || pin.length > 0);

  const handleConfirm = async () => {
    if (!canConfirm) return;

    setIsDeleting(true);
    setError(null);

    try {
      // Verify PIN if required
      if (requirePin && onPinVerify) {
        const isValid = await onPinVerify(pin);
        if (!isValid) {
          setError("Invalid PIN. Please try again.");
          setIsDeleting(false);
          return;
        }
      }

      await onConfirm();
    } catch (err: any) {
      setError(err.message || "Failed to delete tasks. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-red-200 dark:border-red-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Delete All Tasks
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
            aria-label="Close"
            disabled={isDeleting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-start gap-3 mb-4">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Warning: This action cannot be undone!
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This will move <span className="font-semibold">{taskCount} task{taskCount !== 1 ? 's' : ''}</span> to Trash.
                  You can restore them from Trash within 30 days.
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}
          </div>

          {/* Confirmation Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type <span className="font-mono font-semibold text-red-600 dark:text-red-400">DELETE</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="DELETE"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono"
              disabled={isDeleting}
              autoFocus
            />
          </div>

          {/* PIN Input (if required) */}
          {requirePin && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Enter your PIN:
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                disabled={isDeleting}
                maxLength={8}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm || isDeleting}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete All
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

