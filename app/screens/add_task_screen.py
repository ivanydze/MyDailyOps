from kivymd.uix.screen import MDScreen
from kivy.app import App
from app.supabase.client import supabase
from app.utils.notifier import show_deadline_notification
from datetime import datetime

class AddTaskScreen(MDScreen):

    def save_task(self):
        app = App.get_running_app()

        title = self.ids.title.text.strip()
        description = self.ids.description.text.strip()
        category = self.ids.category.text.strip()
        deadline = self.ids.deadline.text.strip()
        priority = self.ids.priority.text.strip()

        if not title:
            self.ids.error.text = "Title is required"
            return

        # deadline convert to ISO or NULL
        deadline_value = deadline if deadline else None

        try:
            user = supabase.auth.get_user()
            user_id = user.user.id

            supabase.table("tasks").insert({
                "user_id": user_id,
                "title": title,
                "description": description,
                "category": category,
                "deadline": deadline_value,
                "priority": priority,
                "status": "new",
                "pinned": False
            }).execute()

            print("✔ TASK SAVED")

            # Notification
            show_deadline_notification(f"Task '{title}' added to your list")

            app.go_to_tasks()

        except Exception as e:
            print("❌ ERROR:", e)
            self.ids.error.text = "Error saving task"
