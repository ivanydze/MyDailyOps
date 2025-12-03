from kivymd.uix.screen import MDScreen
from kivy.app import App
from kivy.core.window import Window
from app.supabase.client import supabase
from win10toast import ToastNotifier

notifier = ToastNotifier()


class LoginScreen(MDScreen):
    _keyboard_bound = False
    
    def on_enter(self):
        """Called when screen is displayed"""
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
        print(f"DEBUG: Key pressed - keycode={keycode}, text={text}, modifiers={modifiers}")
        
        # TAB key (keycode 9 or 'tab')
        if keycode == 9 or (isinstance(keycode, str) and keycode == 'tab'):
            try:
                if hasattr(self, 'ids'):
                    if self.ids.email.focus:
                        print("DEBUG: Moving from email to password")
                        self.ids.password.focus = True
                        return True
                    elif self.ids.password.focus:
                        print("DEBUG: Moving from password to email")
                        self.ids.email.focus = True
                        return True
            except Exception as e:
                print(f"DEBUG: Error handling TAB - {e}")
        return False
    def do_login(self):
        email = self.ids.email.text.strip()
        password = self.ids.password.text.strip()
        
        # Clear previous error
        self.ids.error.text = ""

        if not email or not password:
            self.ids.error.text = "⚠ Please fill in all fields"
            return

        try:
            result = supabase.auth.sign_in_with_password(
                {"email": email, "password": password}
            )
            user = result.user

            print(f"✔ LOGIN SUCCESS: {user.email}")

            app = App.get_running_app()
            app.current_user = user
            
            notifier.show_toast(
                "Login Successful",
                f"Welcome back, {user.email}!",
                duration=3,
                threaded=True
            )

            app.go_to_tasks()

        except Exception as e:
            error_msg = str(e)
            print("❌ LOGIN ERROR:", error_msg)
            
            if "Invalid login credentials" in error_msg:
                self.ids.error.text = "⚠ Invalid email or password"
            elif "Email not confirmed" in error_msg:
                self.ids.error.text = "⚠ Please confirm your email first"
            else:
                self.ids.error.text = "⚠ Login failed. Please try again"
            
            notifier.show_toast(
                "Login Failed",
                "Please check your credentials",
                duration=3,
                threaded=True
            )
