import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginScreen from "./screens/LoginScreen";
import Today from "./screens/Today";
import AllTasks from "./screens/AllTasks";
import NewTask from "./screens/NewTask";
import EditTask from "./screens/EditTask";
import { init as initSync, syncNow } from "./services/syncService";
import { supabase, restoreSession } from "./lib/supabaseClient";
import { getCurrentUserId } from "./lib/supabaseClient";
import { useTaskStore } from "./stores/taskStore";

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const syncTasks = useTaskStore((state) => state.sync);

  useEffect(() => {
    const initialize = async () => {
      try {
        // First restore session from localStorage
        await restoreSession();
        
        // Check authentication BEFORE initializing sync
        // Supabase v2: getSession returns { data: { session }, error }
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("[App] Error getting session:", sessionError);
          setIsAuthenticated(false);
          setIsInitialized(true);
          return;
        }
        
        if (!data?.session) {
          console.log("[App] Not authenticated → redirect to Login");
          setIsAuthenticated(false);
          setIsInitialized(true);
          return;
        }

        console.log("[App] Authenticated → initializing sync");
        setIsAuthenticated(true);

        // Initialize sync service
        await initSync();
        
        // Sync tasks and update store
        console.log('[App] Syncing tasks...');
        await syncTasks();

        // Set up real-time listener for tasks changes (only if authenticated)
        const tasksChannel = supabase
          .channel('tasks')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'tasks' },
            async (payload) => {
              console.log('[App] Real-time task change detected:', payload);
              const userId = await getCurrentUserId();
              if (userId) {
                const changedTask = payload.new as any;
                if (changedTask && changedTask.user_id === userId) {
                  console.log('[App] Syncing tasks after real-time change...');
                  await syncTasks();
                }
              }
            }
          )
          .subscribe();

        setIsInitialized(true);

        // Cleanup on unmount
        return () => {
          console.log('[App] Cleaning up real-time listener');
          supabase.removeChannel(tasksChannel);
        };
      } catch (error) {
        console.error('[App] Error initializing:', error);
        setIsInitialized(true); // Still allow app to render
      }
    };

    initialize();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [syncTasks]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route
          element={
            <ProtectedRoute />
          }
        >
          <Route
            element={<Layout />}
          >
            <Route path="/" element={<Today />} />
            <Route path="/today" element={<Today />} />
            <Route path="/tasks" element={<AllTasks />} />
            <Route path="/tasks/new" element={<NewTask />} />
            <Route path="/tasks/:id/edit" element={<EditTask />} />
          </Route>
        </Route>
      </Routes>
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

export default App;
