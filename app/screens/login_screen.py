from kivymd.uix.screen import MDScreen
from kivy.app import App
from app.supabase.client import supabase
from win10toast import ToastNotifier

notifier = ToastNotifier()


class LoginScreen(MDScreen):
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
