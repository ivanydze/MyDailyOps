"""
Settings dialog for MyDailyOps.

Provides theme switching and other app preferences.
"""

from kivymd.uix.dialog import (
    MDDialog, 
    MDDialogHeadlineText,
    MDDialogContentContainer,
    MDDialogButtonContainer
)
from kivymd.uix.boxlayout import MDBoxLayout
from kivymd.uix.label import MDLabel
from kivymd.uix.selectioncontrol import MDSwitch
from kivymd.uix.button import MDButton, MDButtonText
from kivy.app import App
from app.utils.config import get_theme, set_theme


class SettingsDialog:
    """Settings dialog manager"""
    
    def __init__(self):
        self.dialog = None
    
    def show(self):
        """Display the settings dialog"""
        if not self.dialog:
            self._create_dialog()
        self.dialog.open()
    
    def _create_dialog(self):
        """Create the settings dialog"""
        app = App.get_running_app()
        
        # Dialog content
        content = MDBoxLayout(
            orientation="vertical",
            spacing="16dp",
            size_hint_y=None,
            height="80dp",
            padding="16dp"
        )
        
        # Theme row
        theme_row = MDBoxLayout(
            orientation="horizontal",
            spacing="16dp",
            size_hint_y=None,
            height="48dp"
        )
        
        theme_label = MDLabel(
            text="Dark Mode",
            font_style="Body",
            role="large",
            size_hint_x=0.7
        )
        
        # Theme switch
        current_theme = get_theme()
        theme_switch = MDSwitch(
            active=current_theme == "dark",
            size_hint_x=0.3
        )
        theme_switch.bind(active=self._on_theme_switch)
        
        theme_row.add_widget(theme_label)
        theme_row.add_widget(theme_switch)
        content.add_widget(theme_row)
        
        # Create dialog
        self.dialog = MDDialog(
            MDDialogHeadlineText(
                text="Settings",
            ),
            MDDialogContentContainer(
                content,
            ),
            MDDialogButtonContainer(
                MDButton(
                    MDButtonText(text="Close"),
                    style="text",
                    on_release=lambda x: self.dialog.dismiss()
                ),
            ),
        )
    
    def _on_theme_switch(self, switch, value):
        """Handle theme switch toggle"""
        app = App.get_running_app()
        new_theme = "dark" if value else "light"
        
        # Save to config
        set_theme(new_theme)
        
        # Apply theme
        app.theme_cls.theme_style = new_theme.capitalize()
        
        print(f"✅ Theme changed to: {new_theme}")

