import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  userId: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  userId: null,
  isAuthenticated: false,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen to Supabase auth state changes
  useEffect(() => {
    console.log('[AuthContext] Setting up auth listener...');

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        // Handle invalid refresh token
        if (error.message?.includes('Invalid Refresh Token') || error.message?.includes('Refresh Token Not Found')) {
          console.log('[AuthContext] Invalid refresh token detected, clearing session');
          supabase.auth.signOut().catch(() => {}); // Clear Supabase client
          setSession(null);
          setLoading(false);
          return;
        }
        console.error('[AuthContext] Error getting session:', error);
      }
      console.log('[AuthContext] Initial session:', session?.user?.email || 'none');
      setSession(session);
      setLoading(false);
    }).catch((error: any) => {
      // Handle invalid refresh token in catch block
      if (error?.message?.includes('Invalid Refresh Token') || error?.message?.includes('Refresh Token Not Found')) {
        console.log('[AuthContext] Invalid refresh token detected (in catch), clearing session');
        supabase.auth.signOut().catch(() => {});
        setSession(null);
      } else {
        console.error('[AuthContext] Exception getting session:', error);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] Auth state changed:', event, session?.user?.email);
        setSession(session);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    console.log('[AuthContext] Logging in:', email);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    // Session will be updated by onAuthStateChange listener
  };

  const logout = async () => {
    console.log('[AuthContext] Logging out...');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    // Session will be cleared by onAuthStateChange listener
  };

  // Derived values
  const user = session?.user || null;
  const userId = session?.user?.id || null;
  const isAuthenticated = !!session;

  return (
    <AuthContext.Provider value={{ user, session, userId, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
