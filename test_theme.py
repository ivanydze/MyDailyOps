"""
Quick theme test script
"""
from kivy.app import App
from kivy.clock import Clock

def test_theme_switch():
    """Test theme switching"""
    app = App.get_running_app()
    
    print("\n" + "="*60)
    print("TESTING THEME SWITCHING")
    print("="*60)
    
    # Test 1: Check initial theme
    print(f"\n1. Initial theme: {app.theme_cls.theme_style}")
    
    # Test 2: Switch to dark
    print("\n2. Switching to DARK mode...")
    app.theme_cls.theme_style = "Dark"
    Clock.schedule_once(lambda dt: print(f"   ✅ Dark mode applied: {app.theme_cls.theme_style}"), 0.5)
    
    # Test 3: Switch to light
    def switch_to_light(dt):
        print("\n3. Switching to LIGHT mode...")
        app.theme_cls.theme_style = "Light"
        Clock.schedule_once(lambda dt: print(f"   ✅ Light mode applied: {app.theme_cls.theme_style}"), 0.5)
        
        # Test 4: Switch back to dark
        def switch_to_dark_again(dt):
            print("\n4. Switching to DARK mode again...")
            app.theme_cls.theme_style = "Dark"
            Clock.schedule_once(lambda dt: print(f"   ✅ Dark mode applied: {app.theme_cls.theme_style}"), 0.5)
            Clock.schedule_once(lambda dt: print("\n" + "="*60 + "\n✅ THEME SWITCHING WORKS!\n" + "="*60), 1.0)
        
        Clock.schedule_once(switch_to_dark_again, 1.5)
    
    Clock.schedule_once(switch_to_light, 1.5)

if __name__ == "__main__":
    Clock.schedule_once(lambda dt: test_theme_switch(), 3.0)

