from kivymd.uix.screen import MDScreen
from kivymd.uix.boxlayout import MDBoxLayout
from kivymd.uix.label import MDLabel
from kivymd.uix.button import MDIconButton
from kivymd.uix.menu import MDDropdownMenu
from kivy.clock import mainthread
from kivy.app import App
from kivy.core.window import Window
from kivy.animation import Animation
from datetime import datetime, timedelta, date
from win10toast import ToastNotifier

from app.supabase.client import supabase
from app.widgets.task_card import TaskCard
from app.widgets.settings_dialog import SettingsDialog
from app.utils.config import get_last_filter, set_last_filter
from app.utils.tasks import (
    group_tasks_by_date,
    sort_tasks,
    filter_tasks,
    parse_deadline,
    TaskFilter
)
from app.database.offline import init_db, cache_get_all, cache_upsert, cache_delete, add_pending_update
from app.utils.sync import sync_now

notifier = ToastNotifier()


class TasksScreen(MDScreen):

    all_tasks = []      # полный НЕфильтрованный список
    filtered_tasks = [] # задачи после фильтрации/поиска
    current_filter = "all"
    search_active = False
    _keyboard_bound = False
    settings_dialog = None

    def on_pre_enter(self, *args):
        # Bind keyboard shortcuts
        if not self._keyboard_bound:
            Window.bind(on_key_down=self._on_keyboard_down)
            self._keyboard_bound = True
            print("✅ Keyboard shortcuts bound: Ctrl+F=Search, Ctrl+G=Filter, F5=Reload")
        
        # Load tasks first
        self.load_tasks()
        
        # Load and apply last filter preference
        last_filter = get_last_filter()
        if last_filter and last_filter != "all":
            self.current_filter = last_filter
            self.apply_filter()
            print(f"✅ Applied saved filter: {last_filter}")
    
    # WRAPPER METHODS FOR UI BUTTONS (guaranteed to work)
    def btn_search_click(self):
        """Called from SEARCH button"""
        print("🔘 SEARCH button clicked!")
        self.toggle_search()
    
    def btn_filter_click(self, button):
        """Called from FILTER button"""  
        print("🔘 FILTER button clicked!")
        self.open_filter_menu(button)
    
    def btn_reload_click(self):
        """Called from RELOAD button - triggers sync"""
        print("🔘 RELOAD button clicked!")
        self.sync_tasks()
    
    def open_settings(self):
        """Open settings dialog"""
        print("⚙️ Opening settings dialog")
        if not self.settings_dialog:
            self.settings_dialog = SettingsDialog()
        self.settings_dialog.show()
    
    def _on_keyboard_down(self, instance, keyboard, keycode, text, modifiers):
        """Handle keyboard shortcuts"""
        # Ctrl+F for search
        if keycode == 33 and 'ctrl' in modifiers:  # F key
            print("⌨️ Ctrl+F pressed - toggling search")
            self.toggle_search()
            return True
        # Ctrl+G for filter  
        elif keycode == 34 and 'ctrl' in modifiers:  # G key
            print("⌨️ Ctrl+G pressed - opening filter")
            self.open_filter_menu(None)
            return True
        # F5 for reload
        elif keycode == 286:  # F5
            print("⌨️ F5 pressed - reloading")
            self.load_tasks()
            return True
        return False
    

    # -------------------------
    # LOADING TASKS
    # -------------------------
    @mainthread
    def load_tasks(self):
        """Load tasks from SQLite cache (offline-first)"""
        print("🔄 load_tasks() called!")
        app = App.get_running_app()
        user = app.current_user

        if not user:
            print("❌ No logged user")
            return

        try:
            # Initialize database if needed
            init_db()
            
            # Load from local cache
            self.all_tasks = cache_get_all()
            
            # If cache is empty, try initial sync from Supabase
            if len(self.all_tasks) == 0:
                print("ℹ️ Cache is empty, performing initial sync...")
                success = sync_now(user.id)
                if success:
                    self.all_tasks = cache_get_all()
            
            print(f"✅ Loaded {len(self.all_tasks)} tasks from cache")
            
            # Apply filter to populate filtered_tasks
            self.apply_filter()
            
            # Check notifications
            self.check_notifications()
            
        except Exception as e:
            print(f"❌ Error loading tasks: {e}")
            import traceback
            traceback.print_exc()
            notifier.show_toast(
                "Error",
                "Failed to load tasks from cache.",
                duration=3,
                threaded=True
            )

    @mainthread
    def sync_tasks(self):
        """Sync with Supabase and reload from cache"""
        print("🔄 sync_tasks() called!")
        app = App.get_running_app()
        user = app.current_user

        if not user:
            print("❌ No logged user")
            return

        try:
            # Perform sync
            success = sync_now(user.id)
            
            if success:
                # Reload from cache
                self.all_tasks = cache_get_all()
                self.apply_filter()
                
                notifier.show_toast(
                    "Sync Complete",
                    f"Synced {len(self.all_tasks)} tasks",
                    duration=2,
                    threaded=True
                )
            else:
                notifier.show_toast(
                    "Sync Error",
                    "Failed to sync with server",
                    duration=3,
                    threaded=True
                )
                
        except Exception as e:
            print(f"❌ Error syncing: {e}")
            notifier.show_toast(
                "Sync Error",
                "Failed to sync tasks",
                duration=3,
                threaded=True
            )
    
    def check_notifications(self):
        """Check for tasks due today and show notifications"""
        today = date.today()
        for task in self.all_tasks:
            dl_date = parse_deadline(task.get("deadline"))
            
            if dl_date and dl_date == today:
                notifier.show_toast(
                    "Task Deadline",
                    f"{task['title']} is due today!",
                    duration=5,
                    threaded=True
                )

    # -------------------------
    # RENDER
    # -------------------------
    def group_tasks_by_date(self, tasks):
        """Group tasks by deadline date - delegated to utils"""
        return group_tasks_by_date(tasks)

    def render_tasks(self):
        lst = self.ids.tasks_list
        lst.clear_widgets()

        groups = self.group_tasks_by_date(self.filtered_tasks)
        
        # Show empty state if no tasks
        if not any(items for items in groups.values()):
            empty_box = MDBoxLayout(
                orientation="vertical",
                size_hint_y=None,
                height="200dp",
                padding="20dp",
                spacing="16dp"
            )
            
            from kivymd.uix.label import MDIcon
            empty_icon = MDIcon(
                icon="clipboard-text-off-outline",
                size_hint=(None, None),
                size=("64dp", "64dp"),
                halign="center",
                pos_hint={"center_x": 0.5}
            )
            
            empty_label = MDLabel(
                text="No tasks found",
                font_style="Title",
                halign="center",
                theme_text_color="Secondary"
            )
            empty_label.role = "medium"
            
            empty_hint = MDLabel(
                text="Tap the + button to add a new task",
                font_style="Body",
                halign="center",
                theme_text_color="Hint"
            )
            empty_hint.role = "small"
            
            empty_box.add_widget(empty_icon)
            empty_box.add_widget(empty_label)
            empty_box.add_widget(empty_hint)
            lst.add_widget(empty_box)
            return

        for group_name, items in groups.items():
            if len(items) == 0:
                continue

            # ----- Group Header -----
            header = MDBoxLayout(
                orientation="horizontal",
                size_hint_y=None,
                height="48dp",
                padding=["8dp", "16dp", "8dp", "8dp"],
            )

            header_label = MDLabel(
                text=f"{group_name} ({len(items)})",
                font_style="Title",
                bold=True,
                theme_text_color="Primary"
            )
            header_label.role = "medium"
            header.add_widget(header_label)

            lst.add_widget(header)

            # ----- Task Cards -----
            for task in items:
                card = TaskCard(
                    task=task,
                    callback_done=self.toggle_done,
                    callback_edit=self.open_edit_task,
                    callback_delete=self.delete_task
                )

                lst.add_widget(card)

                # Fade-in animation
                card.opacity = 0
                Animation(opacity=1, d=0.25).start(card)

    def get_icon(self, t):
        if t.get("pinned"):
            return "pin"
        if t.get("status") == "done":
            return "check"
        if t.get("priority") == "high":
            return "circle"
        if t.get("priority") == "medium":
            return "circle-outline"
        return "checkbox-blank-circle-outline"

    def get_priority_color(self, t):
        pr = t.get("priority", "medium")
        if pr == "high":
            return (1, 0.2, 0.2, 1)   # red
        if pr == "medium":
            return (1, 0.5, 0.1, 1)   # orange
        return (0.2, 0.8, 0.2, 1)     # green

    def get_subtitle(self, t):
        pr = t.get("priority", "medium")
        st = t.get("status", "new")
        dl = t.get("deadline", None)

        color = {
            "high": "ff4444",
            "medium": "ff8800",
            "low": "44cc44"
        }.get(pr, "cccccc")

        text = f"[color={color}]{pr} priority[/color] / {st}"
        if dl:
            text += f" / deadline {dl}"

        return text

    # -------------------------
    # OPEN SCREENS
    # -------------------------
    def open_task(self, task):
        app = App.get_running_app()
        screen = app.root.get_screen("task_details")
        screen.set_task(task)
        app.root.current = "task_details"

    def open_edit_task(self, task):
        """Открывает экран редактирования задачи"""
        app = App.get_running_app()
        screen = app.root.get_screen("edit_task")
        screen.set_task(task)
        app.root.current = "edit_task"

    def open_add_task(self):
        app = App.get_running_app()
        app.root.current = "add_task"

    def delete_task(self, task):
        """Delete a task (offline-first)"""
        try:
            # Delete from cache
            cache_delete(task["id"])
            
            # Add to sync queue
            add_pending_update("delete", task["id"])
            
            notifier.show_toast(
                "Task Deleted",
                f"'{task['title']}' has been deleted",
                duration=3,
                threaded=True
            )
            self.load_tasks()
        except Exception as e:
            print(f"❌ Error deleting task: {e}")
            notifier.show_toast(
                "Error",
                "Failed to delete task",
                duration=3,
                threaded=True
            )

    def toggle_done(self, task):
        """Toggle task status between done and new (offline-first)"""
        new_status = "done" if task.get("status") != "done" else "new"
        
        try:
            # Update task data
            updated_task = task.copy()
            updated_task["status"] = new_status
            updated_task["updated_at"] = datetime.utcnow().isoformat() + "+00:00"
            
            # Save to offline cache
            cache_upsert(updated_task)
            
            # Add to sync queue
            add_pending_update("update", updated_task)
            
            # Notification when marking as done
            if new_status == "done":
                notifier.show_toast(
                    "Task Completed",
                    f"'{task['title']}' marked as done ✓",
                    duration=3,
                    threaded=True
                )
            else:
                notifier.show_toast(
                    "Task Restored",
                    f"'{task['title']}' marked as pending",
                    duration=3,
                    threaded=True
                )
            
            self.load_tasks()
        except Exception as e:
            print(f"❌ Error updating task: {e}")
            notifier.show_toast(
                "Error",
                "Failed to update task status",
                duration=3,
                threaded=True
            )

    # -------------------------
    # SEARCH
    # -------------------------
    def toggle_search(self):
        """Toggle search bar visibility with animation"""
        print("🔍 toggle_search() called!")
        from kivy.animation import Animation
        from kivy.clock import Clock
        from kivy.metrics import dp
        
        search_bar = self.ids.search_bar

        if self.search_active:
            # Collapse search bar
            anim = Animation(height=0, opacity=0, duration=0.2)
            anim.start(search_bar)
            self.search_active = False
            
            # Clear search text and restore filtered view
            if hasattr(self.ids, 'search_input'):
                self.ids.search_input.text = ""
            self.apply_filter()
            print("🔍 Search bar collapsed")
        else:
            # Expand search bar
            anim = Animation(height=dp(68), opacity=1, duration=0.2)
            anim.start(search_bar)
            self.search_active = True
            
            # Focus on search input after animation
            Clock.schedule_once(lambda dt: setattr(self.ids.search_input, 'focus', True), 0.3)
            print("🔍 Search bar expanded")

    def apply_search(self, text):
        """Apply search filter to tasks"""
        text = text.lower().strip()

        if text == "":
            # Empty search - restore current filter
            self.apply_filter()
            return

        # Search in all tasks
        search_results = [
            t for t in self.all_tasks
            if text in t["title"].lower() or text in (t.get("description") or "").lower()
        ]
        
        self.filtered_tasks = search_results
        self.render_tasks()
        print(f"🔍 Search: '{text}' → {len(search_results)} results")
    
    def clear_search(self):
        """Clear the search field, reset to filtered tasks, and collapse search bar"""
        if hasattr(self.ids, 'search_input'):
            self.ids.search_input.text = ""
        self.apply_filter()
        
        # Also collapse the search bar
        if self.search_active:
            self.toggle_search()
        
        print("✅ Search cleared and collapsed")

    # -------------------------
    # FILTER
    # -------------------------
    def open_filter_menu(self, caller):
        """Open filter selection menu"""
        print("🔽 open_filter_menu() called!")
        menu_items = [
            {"text": "All",        "on_release": lambda: self.set_filter(TaskFilter.ALL.value)},
            {"text": "New",        "on_release": lambda: self.set_filter(TaskFilter.NEW.value)},
            {"text": "Done",       "on_release": lambda: self.set_filter(TaskFilter.DONE.value)},
            {"text": "Pinned",     "on_release": lambda: self.set_filter(TaskFilter.PINNED.value)},
            {"text": "High",       "on_release": lambda: self.set_filter(TaskFilter.HIGH.value)},
            {"text": "Medium",     "on_release": lambda: self.set_filter(TaskFilter.MEDIUM.value)},
            {"text": "Low",        "on_release": lambda: self.set_filter(TaskFilter.LOW.value)},
        ]

        self.menu = MDDropdownMenu(caller=caller, items=menu_items, width_mult=3)
        self.menu.open()

    def set_filter(self, flt):
        self.current_filter = flt
        self.apply_filter()
        
        # Dismiss menu if it exists
        if hasattr(self, 'menu') and self.menu:
            self.menu.dismiss()
        
        # Save filter preference to config
        set_last_filter(flt)
        print(f"✅ Filter saved: {flt}")

    def apply_filter(self):
        """Apply current filter to tasks - delegated to utils"""
        self.filtered_tasks = filter_tasks(self.all_tasks, self.current_filter)
        self.apply_sort()

    # -------------------------
    # SORT
    # -------------------------
    def apply_sort(self):
        """Sort filtered tasks - delegated to utils"""
        self.filtered_tasks = sort_tasks(self.filtered_tasks)
        self.render_tasks()
