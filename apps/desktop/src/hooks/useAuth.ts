import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    try {
      // Supabase v2: getSession returns { data: { session }, error }
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("[Auth] Error getting session:", error);
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(!!data?.session);
      }
    } catch (error) {
      console.error("[Auth] Exception checking auth:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  return { isAuthenticated, isLoading };
}

