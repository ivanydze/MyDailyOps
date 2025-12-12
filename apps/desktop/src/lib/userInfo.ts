/**
 * Get current user information from Supabase
 */

import { supabase } from "./supabaseClient";

export interface UserInfo {
  id: string;
  email: string | undefined;
  name?: string | undefined;
}

/**
 * Get current user information
 * Returns null if not authenticated
 */
export async function getCurrentUserInfo(): Promise<UserInfo | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      // Handle invalid refresh token
      if (error.message?.includes('Invalid Refresh Token') || error.message?.includes('Refresh Token Not Found')) {
        console.log('[UserInfo] Invalid refresh token detected, clearing session');
        localStorage.removeItem("sb-session");
        await supabase.auth.signOut();
        return null;
      }
      console.error('[UserInfo] Error getting session:', error);
      return null;
    }

    const user = data?.session?.user;
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.user_metadata?.full_name,
    };
  } catch (error: any) {
    // Handle invalid refresh token in catch block
    if (error?.message?.includes('Invalid Refresh Token') || error?.message?.includes('Refresh Token Not Found')) {
      console.log('[UserInfo] Invalid refresh token detected (in catch), clearing session');
      localStorage.removeItem("sb-session");
      await supabase.auth.signOut();
      return null;
    }
    console.error('[UserInfo] Exception getting user info:', error);
    return null;
  }
}

/**
 * Get current user email (convenience function)
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  const userInfo = await getCurrentUserInfo();
  return userInfo?.email || null;
}

