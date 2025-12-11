import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { 
  Home, 
  ListTodo, 
  Plus, 
  Moon,
  Sun,
  LogOut,
  Calendar
} from "lucide-react";
import { useThemeStore } from "../stores/themeStore";
import { signOut } from "../lib/supabaseClient";
import toast from "react-hot-toast";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggle } = useThemeStore();

  const handleLogout = async () => {
    try {
      // Clear session from Supabase
      await signOut();
      // Clear from localStorage
      localStorage.removeItem("sb-session");
      toast.success("Logged out successfully");
      // Redirect to login
      navigate("/login", { replace: true });
    } catch (error: any) {
      console.error("[Sidebar] Error signing out:", error);
      // Even if signOut fails, clear localStorage and redirect
      localStorage.removeItem("sb-session");
      navigate("/login", { replace: true });
      toast.error(error.message || "Failed to sign out");
    }
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const navItems = [
    { path: "/", icon: Home, label: "Today" },
    { path: "/tasks", icon: ListTodo, label: "All Tasks" },
    { path: "/calendar", icon: Calendar, label: "Calendar" },
    { path: "/tasks/new", icon: Plus, label: "New Task" },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          MyDailyOps
        </h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          // Check if active - for calendar, check if path starts with /calendar
          const isActive = item.path === "/calendar"
            ? location.pathname.startsWith("/calendar")
            : location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                isActive
                  ? "bg-primary-500 text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <button
          onClick={toggle}
          className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
          <span className="font-medium">
            {isDark ? "Light Mode" : "Dark Mode"}
          </span>
        </button>
        
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}

