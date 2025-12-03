from kivymd.uix.screen import MDScreen
from kivymd.uix.pickers import MDModalDatePicker
from kivy.app import App
from kivy.core.window import Window
from app.supabase.client import supabase
from win10toast import ToastNotifier
from datetime import datetime, date

notifier = ToastNotifier()


class AddTaskScreen(MDScreen):
    _keyboard_bound = False
    
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
    
    def on_pre_enter(self):
        """Clear all fields when entering the screen"""
        self.ids.title.text = ""
        self.ids.description.text = ""
        self.ids.category.text = ""
        self.ids.deadline.text = ""
        self.ids.priority.text = ""
        self.ids.error.text = ""
    
    def open_date_picker(self):
        """Open date picker dialog"""
        self.date_dialog = MDModalDatePicker()
        self.date_dialog.bind(on_ok=self.on_date_ok, on_cancel=self.on_date_cancel)
        self.date_dialog.open()
    
    def on_date_ok(self, instance_date_picker):
        """Called when OK button is pressed in date picker"""
        try:
            # Get the selected date
            selected_date = instance_date_picker.get_date()[0]
            
            # Convert to string format YYYY-MM-DD
            if selected_date:
                self.ids.deadline.text = selected_date.strftime("%Y-%m-%d")
                print(f"✅ Date selected: {self.ids.deadline.text}")
            else:
                print("⚠️ No date selected")
            
            # Close the date picker
            instance_date_picker.dismiss()
            
        except Exception as e:
            print(f"❌ Error setting date: {e}")
            import traceback
            traceback.print_exc()
    
    def on_date_cancel(self, instance_date_picker):
        """Called when Cancel button is pressed"""
        print("Date picker cancelled")
        instance_date_picker.dismiss()

    def save_task(self):
        app = App.get_running_app()

        title = self.ids.title.text.strip()
        description = self.ids.description.text.strip()
        category = self.ids.category.text.strip()
        deadline = self.ids.deadline.text.strip()
        priority = self.ids.priority.text.strip().lower()

        # Clear previous error
        self.ids.error.text = ""

        # Validation
        if not title:
            self.ids.error.text = "⚠ Task title is required"
            notifier.show_toast(
                "Validation Error",
                "Please enter a task title",
                duration=3,
                threaded=True
            )
            return

        # Validate priority if provided
        if priority and priority not in ["low", "medium", "high"]:
            self.ids.error.text = "⚠ Priority must be: low, medium, or high"
            return

        # Set default priority if not provided
        if not priority:
            priority = "medium"

        # Validate deadline format if provided
        if deadline:
            try:
                datetime.strptime(deadline, "%Y-%m-%d")
            except ValueError:
                self.ids.error.text = "⚠ Deadline must be in format: YYYY-MM-DD"
                return

        # deadline convert to ISO or NULL
        deadline_value = deadline if deadline else None

        try:
            # Get current user from app
            user = app.current_user
            if not user:
                self.ids.error.text = "⚠ User not logged in"
                return
            
            user_id = user.id

            result = supabase.table("tasks").insert({
                "user_id": user_id,
                "title": title,
                "description": description,
                "category": category,
                "deadline": deadline_value,
                "priority": priority,
                "status": "new",
                "pinned": False
            }).execute()

            print(f"✔ TASK SAVED: {title} (Result: {result})")

            # Success notification
            notifier.show_toast(
                "Task Created",
                f"'{title}' has been added to your tasks ✓",
                duration=3,
                threaded=True
            )

            # Clear fields before going back
            self.on_pre_enter()
            
            # Go back to tasks screen
            app.go_to_tasks()

        except Exception as e:
            print(f"❌ ERROR SAVING TASK: {e}")
            import traceback
            traceback.print_exc()
            self.ids.error.text = "⚠ Error saving task. Please try again."
            notifier.show_toast(
                "Error",
                "Failed to save task",
                duration=3,
                threaded=True
            )
