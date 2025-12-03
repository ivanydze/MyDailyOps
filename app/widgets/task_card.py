from kivymd.uix.swipeitem import MDSwipeItem
from kivy.properties import ObjectProperty, StringProperty, BooleanProperty


class TaskCard(MDSwipeItem):
    """
    Material 3 Task Card with swipe gestures.
    
    Swipe left: Mark as done/undone
    Swipe right: Edit or Delete
    """
    
    task = ObjectProperty()
    title = StringProperty("")
    subtitle = StringProperty("")
    is_done = BooleanProperty(False)
    is_pinned = BooleanProperty(False)
    priority = StringProperty("medium")
    
    callback_done = ObjectProperty()
    callback_edit = ObjectProperty()
    callback_delete = ObjectProperty()

    def __init__(self, task, callback_done, callback_edit, callback_delete, **kwargs):
        super().__init__(**kwargs)
        
        self.task = task
        self.callback_done = callback_done
        self.callback_edit = callback_edit
        self.callback_delete = callback_delete
        
        # Set properties from task data
        self.update_from_task(task)
    
    def update_from_task(self, task):
        """Update card properties from task data"""
        self.title = task.get("title", "Untitled")
        self.is_done = task.get("status") == "done"
        self.is_pinned = task.get("pinned", False)
        self.priority = task.get("priority", "medium")
        
        # Build subtitle with priority and status
        status_text = "✓ Done" if self.is_done else "⏳ Pending"
        priority_text = f"{self.priority.capitalize()} priority"
        
        deadline = task.get("deadline")
        if deadline:
            self.subtitle = f"{priority_text} • {status_text} • Due {deadline}"
        else:
            self.subtitle = f"{priority_text} • {status_text}"
    
    def get_priority_color(self):
        """Return color for priority indicator"""
        colors = {
            "high": (0.96, 0.26, 0.21, 1),    # Red 500
            "medium": (1, 0.6, 0, 1),          # Orange 500
            "low": (0.3, 0.69, 0.31, 1)        # Green 500
        }
        return colors.get(self.priority, colors["medium"])
    
    def get_status_icon(self):
        """Return icon based on task status"""
        if self.is_done:
            return "check-circle"
        elif self.is_pinned:
            return "pin"
        else:
            return "checkbox-blank-circle-outline"

    def mark_done(self):
        """Callback for swipe left or status icon button"""
        if self.callback_done:
            self.callback_done(self.task)

    def edit(self):
        """Callback for edit button (swipe right)"""
        if self.callback_edit:
            self.callback_edit(self.task)

    def delete(self):
        """Callback for delete button (swipe right)"""
        if self.callback_delete:
            self.callback_delete(self.task)
