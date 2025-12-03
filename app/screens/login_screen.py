from kivymd.uix.screen import MDScreen
from kivy.app import App
from app.supabase.client import supabase


class LoginScreen(MDScreen):
    def do_login(self):
        email = self.ids.email.text.strip()
        password = self.ids.password.text.strip()

        if not email or not password:
            self.ids.error.text = "Fill all fields"
            return

        try:
            result = supabase.auth.sign_in_with_password(
                {"email": email, "password": password}
            )
            user = result.user

            print(f"✔ LOGIN SUCCESS: {user}")

            app = App.get_running_app()
            app.current_user = user

            app.go_to_tasks()

        except Exception as e:
            print("❌ LOGIN ERROR:", e)
            self.ids.error.text = "Login failed"
