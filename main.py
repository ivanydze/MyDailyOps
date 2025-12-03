from kivy.lang import Builder
from kivymd.app import MDApp
from kivymd.uix.screenmanager import MDScreenManager
from kivy.core.window import Window

# Screens
from app.screens.login_screen import LoginScreen
from app.screens.tasks_screen import TasksScreen
from app.screens.add_task_screen import AddTaskScreen
from app.screens.task_details_screen import TaskDetailsScreen
from app.screens.edit_task_screen import EditTaskScreen

from app.widgets.task_card import TaskCard

Window.size = (400, 700)


class MyDailyOpsApp(MDApp):

    current_user = None

    def build(self):
        # Включаем тему МАТЕРИАЛ 3 ДО загрузки KV
        self.theme_cls.material_style = "M3"
        self.theme_cls.theme_style = "Light"
        self.theme_cls.primary_palette = "Blue"
        self.theme_cls.primary_hue = "500"

        # Теперь можно грузить KV
        Builder.load_file("app/ui/login_screen.kv")
        Builder.load_file("app/ui/tasks_screen.kv")
        Builder.load_file("app/ui/add_task_screen.kv")
        Builder.load_file("app/ui/task_details_screen.kv")
        Builder.load_file("app/ui/edit_task_screen.kv")
        Builder.load_file("app/widgets/task_card.kv")

        from app.screens.login_screen import LoginScreen
        from app.screens.tasks_screen import TasksScreen
        from app.screens.add_task_screen import AddTaskScreen
        from app.screens.task_details_screen import TaskDetailsScreen
        from app.screens.edit_task_screen import EditTaskScreen

        sm = MDScreenManager()
        sm.add_widget(LoginScreen(name="login"))
        sm.add_widget(TasksScreen(name="tasks"))
        sm.add_widget(AddTaskScreen(name="add_task"))
        sm.add_widget(TaskDetailsScreen(name="task_details"))
        sm.add_widget(EditTaskScreen(name="edit_task"))

        return sm

    def on_login_success(self):
        self.root.current = "tasks"

    def open_add_task(self):
        self.root.current = "add_task"

    def go_to_tasks(self):
        self.root.current = "tasks"
        self.root.get_screen("tasks").load_tasks()


if __name__ == "__main__":
    MyDailyOpsApp().run()
