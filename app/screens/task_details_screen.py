from kivymd.uix.screen import MDScreen
from kivy.properties import DictProperty
from kivy.app import App
from app.supabase.client import supabase


class TaskDetailsScreen(MDScreen):
    task = DictProperty({})

    def set_task(self, task):
        """Loads task data into screen."""
        self.task = task
        self.ids.title.text = task.get("title", "")
        self.ids.description.text = task.get("description", "")
        self.ids.priority.text = f"Priority: {task.get('priority', 'medium')}"
        self.ids.status.text = f"Status: {task.get('status', 'new')}"
        self.ids.pinned.text = "Pinned: YES" if task.get("pinned") else "Pinned: NO"
        self.ids.category.text = f"Category: {task.get('category', 'none')}"
        self.ids.deadline.text = f"Deadline: {task.get('deadline', 'none')}"
        self.ids.dates.text = (
            f"Created: {task.get('created_at','')}\n"
            f"Updated: {task.get('updated_at','')}"
        )

    def go_back(self):
        App.get_running_app().root.current = "tasks"

    def toggle_pin(self):
        """Pin or unpin the task."""
        new_value = not self.task.get("pinned")
        supabase.table("tasks").update({"pinned": new_value}).eq("id", self.task["id"]).execute()
        self.task["pinned"] = new_value
        self.set_task(self.task)

    def toggle_status(self):
        """Mark task done / not done."""
        new_status = "done" if self.task.get("status") != "done" else "new"
        supabase.table("tasks").update({"status": new_status}).eq("id", self.task["id"]).execute()
        self.task["status"] = new_status
        self.set_task(self.task)

    def delete_task(self):
        """Deletes task."""
        supabase.table("tasks").delete().eq("id", self.task["id"]).execute()
        App.get_running_app().root.current = "tasks"

    def edit_task(self):
        """Open edit screen."""
        app = App.get_running_app()
        edit_screen = app.root.get_screen("edit_task")
        edit_screen.set_task(self.task)
        app.root.current = "edit_task"
