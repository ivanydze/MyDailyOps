from kivymd.uix.screen import MDScreen
from kivy.app import App
from app.supabase.client import supabase
from app.utils.notifier import show_deadline_notification


class EditTaskScreen(MDScreen):
    task = None

    def set_task(self, task):
        """Load existing task into fields."""
        self.task = task
        self.ids.title.text = task.get("title", "")
        self.ids.description.text = task.get("description", "")
        self.ids.category.text = task.get("category", "")
        self.ids.deadline.text = task.get("deadline", "") or ""
        self.ids.priority.text = task.get("priority", "medium")

    def save_changes(self):
        new_title = self.ids.title.text.strip()
        new_description = self.ids.description.text.strip()
        new_category = self.ids.category.text.strip()
        new_deadline = self.ids.deadline.text.strip()
        new_priority = self.ids.priority.text.strip()

        if not new_title:
            self.ids.error.text = "Title is required"
            return

        try:
            supabase.table("tasks").update({
                "title": new_title,
                "description": new_description,
                "category": new_category,
                "deadline": new_deadline if new_deadline else None,
                "priority": new_priority
            }).eq("id", self.task["id"]).execute()

            print("✔ TASK UPDATED")

            # Notification
            show_deadline_notification(f"Task '{new_title}' updated")

            App.get_running_app().root.current = "task_details"

            # refresh details screen
            details = App.get_running_app().root.get_screen("task_details")
            details.set_task({
                **self.task,
                "title": new_title,
                "description": new_description,
                "category": new_category,
                "deadline": new_deadline,
                "priority": new_priority
            })

        except Exception as e:
            print("❌ ERROR:", e)
            self.ids.error.text = "Failed to update"
