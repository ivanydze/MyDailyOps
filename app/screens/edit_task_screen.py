from kivymd.uix.screen import MDScreen
from kivymd.uix.pickers import MDModalDatePicker, MDTimePickerDialVertical
from kivymd.uix.menu import MDDropdownMenu
from kivy.app import App
from kivy.core.window import Window
from app.supabase.client import supabase
from win10toast import ToastNotifier
from datetime import datetime, time

notifier = ToastNotifier()


class EditTaskScreen(MDScreen):
    task = None
    _keyboard_bound = False
    priority_menu = None
    
    def on_enter(self):
        """Called when screen is displayed"""
        if not self._keyboard_bound:
            Window.bind(on_key_down=self.on_keyboard_down)
            self._keyboard_bound = True
    
    def on_leave(self):
        """Called when leaving the screen"""
        if self._keyboard_bound:
            Window.unbind(on_key_down=self.on_keyboard_down)
            self._keyboard_bound = False
    
    def on_keyboard_down(self, instance, keyboard, keycode, text, modifiers):
        """Handle keyboard events for TAB navigation"""
        if keycode == 9:  # TAB key
            try:
                if hasattr(self, 'ids'):
                    if self.ids.title.focus:
                        self.ids.description.focus = True
                        return True
                    elif self.ids.description.focus:
                        self.ids.category.focus = True
                        return True
                    elif self.ids.category.focus:
                        self.ids.deadline.focus = True
                        return True
                    elif self.ids.deadline.focus:
                        self.ids.priority.focus = True
                        return True
                    elif self.ids.priority.focus:
                        self.ids.title.focus = True
                        return True
            except:
                pass
        return False

    def set_task(self, task):
        """Load existing task into fields."""
        self.task = task
        self.ids.title.text = task.get("title", "")
        self.ids.description.text = task.get("description", "") or ""
        self.ids.category.text = task.get("category", "") or ""
        
        # Handle deadline format - convert to readable format
        deadline = task.get("deadline", "")
        if deadline:
            try:
                # Parse various formats
                if 'T' in deadline:
                    # ISO format: '2025-12-31T15:30:00+00:00' → '2025-12-31 15:30'
                    dt = datetime.fromisoformat(deadline.replace('+00:00', ''))
                    deadline = dt.strftime("%Y-%m-%d %H:%M")
                # else keep as is (YYYY-MM-DD)
            except Exception as e:
                print(f"⚠️ Error parsing deadline: {e}")
                if 'T' in deadline:
                    deadline = deadline.split('T')[0]
        
        self.ids.deadline.text = deadline or ""
        self.ids.priority.text = task.get("priority", "medium")
        self.ids.error.text = ""
    
    def open_date_picker(self):
        """Open date picker dialog"""
        self.date_dialog = MDModalDatePicker()
        self.date_dialog.bind(on_ok=self.on_date_ok, on_cancel=self.on_date_cancel)
        self.date_dialog.open()
    
    def on_date_ok(self, instance_date_picker):
        """Called when OK button is pressed in date picker - then open time picker"""
        try:
            # Get the selected date
            selected_date = instance_date_picker.get_date()[0]
            
            if selected_date:
                self.selected_date = selected_date
                print(f"✅ Date selected: {selected_date}")
                
                # Close date picker
                instance_date_picker.dismiss()
                
                # Open time picker
                self.open_time_picker()
            else:
                print("⚠️ No date selected")
            
        except Exception as e:
            print(f"❌ Error setting date: {e}")
            import traceback
            traceback.print_exc()
    
    def on_date_cancel(self, instance_date_picker):
        """Called when Cancel button is pressed"""
        print("Date picker cancelled")
        instance_date_picker.dismiss()
    
    def open_time_picker(self):
        """Open time picker dialog after date is selected"""
        self.time_dialog = MDTimePickerDialVertical()
        self.time_dialog.bind(on_ok=self.on_time_ok, on_cancel=self.on_time_cancel)
        self.time_dialog.open()
    
    def on_time_ok(self, instance_time_picker):
        """Called when time is selected"""
        try:
            # Get the selected time
            selected_time = instance_time_picker.get_time()
            
            if selected_time and hasattr(self, 'selected_date'):
                # Combine date and time into ISO format
                datetime_obj = datetime.combine(
                    self.selected_date,
                    selected_time
                )
                
                # Format as readable string
                self.ids.deadline.text = datetime_obj.strftime("%Y-%m-%d %H:%M")
                print(f"✅ Date & Time set: {self.ids.deadline.text}")
            
            # Close time picker
            instance_time_picker.dismiss()
            
        except Exception as e:
            print(f"❌ Error setting time: {e}")
            import traceback
            traceback.print_exc()
    
    def on_time_cancel(self, instance_time_picker):
        """Called when time picker is cancelled"""
        print("Time picker cancelled")
        instance_time_picker.dismiss()
    
    def open_priority_menu(self, caller):
        """Open priority selection menu"""
        menu_items = [
            {
                "text": "Low",
                "on_release": lambda: self.set_priority("low"),
            },
            {
                "text": "Medium",
                "on_release": lambda: self.set_priority("medium"),
            },
            {
                "text": "High",
                "on_release": lambda: self.set_priority("high"),
            },
        ]
        
        self.priority_menu = MDDropdownMenu(
            caller=caller,
            items=menu_items,
            width_mult=3
        )
        self.priority_menu.open()
    
    def set_priority(self, priority):
        """Set selected priority"""
        self.ids.priority.text = priority
        self.priority_menu.dismiss()
        print(f"✅ Priority set to: {priority}")

    def save_changes(self):
        new_title = self.ids.title.text.strip()
        new_description = self.ids.description.text.strip()
        new_category = self.ids.category.text.strip()
        new_deadline = self.ids.deadline.text.strip()
        new_priority = self.ids.priority.text.strip().lower()

        # Clear previous error
        self.ids.error.text = ""

        # Validation
        if not new_title:
            self.ids.error.text = "⚠ Task title is required"
            notifier.show_toast(
                "Validation Error",
                "Please enter a task title",
                duration=3,
                threaded=True
            )
            return

        # Validate priority if provided
        if new_priority and new_priority not in ["low", "medium", "high"]:
            self.ids.error.text = "⚠ Priority must be: low, medium, or high"
            return

        # Set default priority if not provided
        if not new_priority:
            new_priority = "medium"

        # Validate deadline format if provided
        if new_deadline:
            try:
                # Try parsing as datetime first (YYYY-MM-DD HH:MM)
                try:
                    datetime.strptime(new_deadline, "%Y-%m-%d %H:%M")
                except ValueError:
                    # Fall back to date only (YYYY-MM-DD)
                    datetime.strptime(new_deadline, "%Y-%m-%d")
            except ValueError:
                self.ids.error.text = "⚠ Invalid deadline format"
                return

        try:
            supabase.table("tasks").update({
                "title": new_title,
                "description": new_description,
                "category": new_category,
                "deadline": new_deadline if new_deadline else None,
                "priority": new_priority,
                "updated_at": datetime.now().isoformat()
            }).eq("id", self.task["id"]).execute()

            print(f"✔ TASK UPDATED: {new_title}")

            # Success notification
            notifier.show_toast(
                "Task Updated",
                f"'{new_title}' has been updated ✓",
                duration=3,
                threaded=True
            )

            # Go back to tasks screen
            App.get_running_app().go_to_tasks()

        except Exception as e:
            print(f"❌ ERROR UPDATING TASK: {e}")
            import traceback
            traceback.print_exc()
            self.ids.error.text = "⚠ Failed to update task. Please try again."
            notifier.show_toast(
                "Error",
                "Failed to update task",
                duration=3,
                threaded=True
            )
