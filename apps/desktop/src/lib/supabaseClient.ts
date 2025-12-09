/**
 * Supabase client for desktop app
 * Matches mobile app configuration
 */

import { createClient } from '@supabase/supabase-js';

console.log("ENV CHECK:", import.meta.env.VITE_SUPABASE_URL);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] Missing environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  );
}

/**
 * Supabase client instance
 * For desktop, we use localStorage for auth persistence (via browser)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

console.log('[Supabase] Client initialized with localStorage persistence');

/**
 * Restore session from localStorage on startup
 * Supabase v2: setSession returns { data: { session, user }, error }
 */
export async function restoreSession(): Promise<void> {
  try {
    const storedSession = localStorage.getItem("sb-session");
    if (!storedSession) {
      return;
    }

    const sessionData = JSON.parse(storedSession);
    
    // Validate session structure - must have access_token and refresh_token
    if (!sessionData.access_token || !sessionData.refresh_token) {
      console.warn('[Supabase] Invalid session format, removing');
      localStorage.removeItem("sb-session");
      return;
    }

    // Supabase v2: setSession expects { access_token, refresh_token }
    const { data, error } = await supabase.auth.setSession({
      access_token: sessionData.access_token,
      refresh_token: sessionData.refresh_token,
    });
    
    if (error) {
      console.error('[Supabase] Error restoring session:', error);
      localStorage.removeItem("sb-session");
      return;
    }
    
    // Supabase v2: data = { session, user }
    if (data && data.session) {
      console.log("[Auth] Auth restored");
      // Update stored session with latest data
      localStorage.setItem("sb-session", JSON.stringify(data.session));
    } else {
      console.warn('[Supabase] No session in restore response, clearing');
      localStorage.removeItem("sb-session");
    }
  } catch (error) {
    console.error('[Supabase] Error parsing stored session:', error);
    localStorage.removeItem("sb-session");
  }
}

/**
 * Check if user is authenticated
 * Supabase v2: getSession returns { data: { session }, error }
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[Auth] Error getting session:', error);
      return false;
    }
    return data?.session !== null && data?.session !== undefined;
  } catch (error) {
    console.error('[Auth] Exception checking authentication:', error);
    return false;
  }
}

/**
 * Get current user ID
 * Supabase v2: getSession returns { data: { session }, error }
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[Auth] Error getting session:', error);
      return null;
    }
    return data?.session?.user?.id || null;
  } catch (error) {
    console.error('[Auth] Exception getting user ID:', error);
    return null;
  }
}

/**
 * Sign in with email and password
 * Returns Supabase v2 format: { data: { user, session }, error }
 */
export async function signIn(email: string, password: string) {
  const result = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Supabase v2: result = { data: { user, session }, error }
  if (result.error) {
    throw result.error;
  }

  // Validate response structure
  if (!result.data || !result.data.session) {
    throw new Error("Login failed: No session returned");
  }

  return result;
}

/**
 * Sign out
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

