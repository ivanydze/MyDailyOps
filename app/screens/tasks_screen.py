from kivymd.uix.screen import MDScreen
from kivymd.uix.boxlayout import MDBoxLayout
from kivymd.uix.label import MDLabel
from kivymd.uix.button import MDIconButton
from kivymd.uix.menu import MDDropdownMenu
from kivy.clock import mainthread
from kivy.app import App
from kivy.animation import Animation
from datetime import datetime, timedelta, date
from win10toast import ToastNotifier

from app.supabase.client import supabase
from app.widgets.task_card import TaskCard

notifier = ToastNotifier()


class TasksScreen(MDScreen):

    all_tasks = []      # полный НЕфильтрованный список
    filtered_tasks = [] # задачи после фильтрации/поиска
    current_filter = "all"
    search_active = False

    def on_pre_enter(self, *args):
        self.load_tasks()

    # -------------------------
    # LOADING TASKS
    # -------------------------
    @mainthread
    def load_tasks(self):
        app = App.get_running_app()
        user = app.current_user

        if not user:
            print("❌ No logged user")
            return

        try:
            response = supabase.table("tasks") \
                .select("*") \
                .eq("user_id", user.id) \
                .order("created_at", desc=True) \
                .execute()

            self.all_tasks = response.data
            print(f"✅ Loaded {len(self.all_tasks)} tasks from database")
            
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
                "Failed to load tasks. Check your connection.",
                duration=3,
                threaded=True
            )

    def check_notifications(self):
        today = date.today()
        for task in self.all_tasks:
            dl = task.get("deadline")
            if dl:
                # Handle both YYYY-MM-DD and YYYY-MM-DDTHH:MM:SS+TZ formats
                try:
                    if 'T' in dl:
                        # Remove timezone: '2025-12-31T00:00:00+00:00' → '2025-12-31'
                        dl_clean = dl.split('T')[0]
                        dl_date = date.fromisoformat(dl_clean)
                    else:
                        dl_date = date.fromisoformat(dl)
                    
                    if dl_date == today:
                        notifier.show_toast(
                            "Task Deadline",
                            f"{task['title']} is due today!",
                            duration=5,
                            threaded=True
                        )
                except Exception as e:
                    print(f"⚠️ Error parsing deadline for task {task.get('title')}: {e}")

    # -------------------------
    # RENDER
    # -------------------------
    def group_tasks_by_date(self, tasks):
        groups = {
            "Today": [],
            "Tomorrow": [],
            "This Week": [],
            "Later": [],
            "No Deadline": []
        }

        today = date.today()
        tomorrow = today + timedelta(days=1)
        week_end = today + timedelta(days=7)

        print(f"📊 Grouping {len(tasks)} tasks...")

        for t in tasks:
            dl = t.get("deadline")
            if not dl:
                groups["No Deadline"].append(t)
                print(f"  → Task '{t.get('title')}' → No Deadline")
                continue

            # Handle both YYYY-MM-DD and YYYY-MM-DDTHH:MM:SS+TZ formats
            try:
                # Remove timezone info if present
                if 'T' in dl:
                    # Remove timezone: '2025-12-31T00:00:00+00:00' → '2025-12-31'
                    dl_clean = dl.split('T')[0]
                    dl_date = date.fromisoformat(dl_clean)
                else:
                    dl_date = date.fromisoformat(dl)
                
                print(f"  → Task '{t.get('title')}' deadline: {dl_date}")
            except Exception as e:
                print(f"⚠️ Error parsing deadline: {dl} - {e}")
                groups["No Deadline"].append(t)
                continue

            if dl_date == today:
                groups["Today"].append(t)
            elif dl_date == tomorrow:
                groups["Tomorrow"].append(t)
            elif today < dl_date <= week_end:
                groups["This Week"].append(t)
            else:
                groups["Later"].append(t)

        # Print group summary
        for group_name, items in groups.items():
            if items:
                print(f"  📁 {group_name}: {len(items)} tasks")

        return groups

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
        """Delete a task from Supabase"""
        try:
            supabase.table("tasks").delete().eq("id", task["id"]).execute()
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
        """Toggle task status between done and new"""
        new_status = "done" if task.get("status") != "done" else "new"
        
        try:
            supabase.table("tasks").update({"status": new_status}).eq("id", task["id"]).execute()
            
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
        sf = self.ids.search_field

        if self.search_active:
            # скрываем
            sf.height = "0dp"
            sf.opacity = 0
            sf.text = ""
            self.search_active = False
            self.apply_filter()  # вернуть нормальный список
        else:
            # показываем
            sf.height = "48dp"
            sf.opacity = 1
            self.search_active = True

    def on_search(self, text):
        text = text.lower()

        if text.strip() == "":
            self.apply_filter()
            return

        self.filtered_tasks = [
            t for t in self.all_tasks
            if text in t["title"].lower() or text in (t.get("description") or "").lower()
        ]

        self.render_tasks()

    # -------------------------
    # FILTER
    # -------------------------
    def open_filter_menu(self, caller):
        menu_items = [
            {"text": "All",        "on_release": lambda: self.set_filter("all")},
            {"text": "New",        "on_release": lambda: self.set_filter("new")},
            {"text": "Done",       "on_release": lambda: self.set_filter("done")},
            {"text": "Pinned",     "on_release": lambda: self.set_filter("pinned")},
            {"text": "High",       "on_release": lambda: self.set_filter("high")},
            {"text": "Medium",     "on_release": lambda: self.set_filter("medium")},
            {"text": "Low",        "on_release": lambda: self.set_filter("low")},
        ]

        self.menu = MDDropdownMenu(caller=caller, items=menu_items, width_mult=3)
        self.menu.open()

    def set_filter(self, flt):
        self.current_filter = flt
        self.apply_filter()
        self.menu.dismiss()

    def apply_filter(self):
        flt = self.current_filter
        print(f"🔍 Applying filter: {flt} (total tasks: {len(self.all_tasks)})")

        if flt == "all":
            tasks = self.all_tasks
        elif flt == "new":
            tasks = [t for t in self.all_tasks if t.get("status") == "new"]
        elif flt == "done":
            tasks = [t for t in self.all_tasks if t.get("status") == "done"]
        elif flt == "pinned":
            tasks = [t for t in self.all_tasks if t.get("pinned")]
        else:
            tasks = [t for t in self.all_tasks if t.get("priority") == flt]

        self.filtered_tasks = tasks
        print(f"✅ Filter result: {len(self.filtered_tasks)} tasks")
        self.apply_sort()

    # -------------------------
    # SORT
    # -------------------------
    def apply_sort(self):
        print(f"🔄 Sorting {len(self.filtered_tasks)} tasks...")
        self.filtered_tasks = sorted(
            self.filtered_tasks,
            key=lambda t: (
                not t.get("pinned"),
                t.get("status") == "done",
                t.get("priority", ""),
                t.get("created_at", "")
            )
        )
        print(f"✅ Tasks sorted, calling render...")
        self.render_tasks()
