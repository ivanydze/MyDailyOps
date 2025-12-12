/**
 * User Profile Component
 * Displays user initials in a circular avatar
 */

import { useState, useEffect } from "react";
import { getUserInitials, getUserColor, getUserDisplayName } from "../utils/userProfile";
import { getCurrentUserInfo, UserInfo } from "../lib/userInfo";
import { supabase } from "../lib/supabaseClient";
import ProfileModal from "./ProfileModal";

interface UserProfileProps {
  size?: "sm" | "md" | "lg";
  showName?: boolean;
}

export default function UserProfile({ size = "md", showName = false }: UserProfileProps) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserInfo();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUserInfo();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserInfo = async () => {
    setIsLoading(true);
    const info = await getCurrentUserInfo();
    setUserInfo(info);
    setIsLoading(false);
  };

  if (isLoading || !userInfo) {
    return (
      <div className={`${size === "sm" ? "w-8 h-8" : size === "md" ? "w-10 h-10" : "w-12 h-12"} rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse`} />
    );
  }

  const initials = getUserInitials(userInfo.email || userInfo.name);
  const color = getUserColor(userInfo.email || userInfo.id);
  const displayName = getUserDisplayName(userInfo.email, userInfo.name);

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full"
        aria-label="User profile"
      >
        <div
          className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold text-white shadow-sm`}
          style={{ backgroundColor: color }}
        >
          {initials}
        </div>
        {showName && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {displayName}
          </span>
        )}
      </button>
      
      {isModalOpen && (
        <ProfileModal
          userInfo={userInfo}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}

