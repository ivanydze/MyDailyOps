from kivymd.uix.screen import MDScreen
from kivymd.uix.pickers import MDModalDatePicker, MDTimePickerDialVertical
from kivymd.uix.menu import MDDropdownMenu
from kivy.app import App
from kivy.core.window import Window
from app.supabase.client import supabase
from app.utils.tasks import get_predefined_categories, TaskCategory
from win10toast import ToastNotifier
from datetime import datetime, date, time

notifier = ToastNotifier()


class AddTaskScreen(MDScreen):
    _keyboard_bound = False
    priority_menu = None
    category_menu = None
    
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
            # Get the selected time - use the 'time' property
            selected_time = instance_time_picker.time
            
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
    
    def open_category_menu(self, caller):
        """Open category selection menu"""
        # Build menu items from predefined categories
        menu_items = []
        for category in get_predefined_categories():
            menu_items.append({
                "text": category,
                "on_release": lambda cat=category: self.set_category(cat),
            })
        
        # Add "Custom..." option
        menu_items.append({
            "text": "Custom...",
            "on_release": lambda: self.enable_custom_category(),
        })
        
        self.category_menu = MDDropdownMenu(
            caller=caller,
            items=menu_items,
            width_mult=3
        )
        self.category_menu.open()
    
    def set_category(self, category):
        """Set selected category"""
        self.ids.category.text = category
        self.ids.category.readonly = True
        self.category_menu.dismiss()
        print(f"✅ Category set to: {category}")
    
    def enable_custom_category(self):
        """Allow custom category input"""
        self.ids.category.readonly = False
        self.ids.category.text = ""
        self.ids.category.focus = True
        self.category_menu.dismiss()
        print("✅ Custom category enabled")

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
                # Try parsing as datetime first (YYYY-MM-DD HH:MM)
                try:
                    datetime.strptime(deadline, "%Y-%m-%d %H:%M")
                except ValueError:
                    # Fall back to date only (YYYY-MM-DD)
                    datetime.strptime(deadline, "%Y-%m-%d")
            except ValueError:
                self.ids.error.text = "⚠ Invalid deadline format"
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
