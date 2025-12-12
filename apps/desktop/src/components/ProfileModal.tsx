/**
 * Profile Modal Component
 * Displays user profile information and allows logout
 */

import { useState } from "react";
import { X } from "lucide-react";
import { getUserInitials, getUserColor, getUserDisplayName } from "../utils/userProfile";
import { UserInfo } from "../lib/userInfo";
import { signOut } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

interface ProfileModalProps {
  userInfo: UserInfo;
  onClose: () => void;
}

export default function ProfileModal({ userInfo, onClose }: ProfileModalProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  const initials = getUserInitials(userInfo.email || userInfo.name);
  const color = getUserColor(userInfo.email || userInfo.id);
  const displayName = getUserDisplayName(userInfo.email, userInfo.name);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center font-semibold text-white text-xl shadow-md"
              style={{ backgroundColor: color }}
            >
              {initials}
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {displayName}
              </p>
              {userInfo.email && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {userInfo.email}
                </p>
              )}
            </div>
          </div>

          {/* User Info */}
          <div className="space-y-3 mb-6">
            {userInfo.email && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Email
                </label>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {userInfo.email}
                </p>
              </div>
            )}
            {userInfo.name && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Name
                </label>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {userInfo.name}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              {isLoggingOut ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

