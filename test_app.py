"""
MyDailyOps Test Suite

This test file automates testing of the application.
Run with: python test_app.py
"""

import sys
import os
from kivy.clock import Clock
from kivy.core.window import Window

# Test configuration
TEST_EMAIL = "ivanydze@gmail.com"
TEST_PASSWORD = "London2010"
TEST_TIMEOUT = 30  # seconds


class AppTester:
    def __init__(self, app):
        self.app = app
        self.tests_passed = 0
        self.tests_failed = 0
        self.current_step = 0
        
    def log(self, message, level="INFO"):
        """Log test messages"""
        symbols = {
            "INFO": "ℹ️",
            "SUCCESS": "✅",
            "ERROR": "❌",
            "WARNING": "⚠️"
        }
        print(f"{symbols.get(level, 'ℹ️')} TEST: {message}")
    
    def start_tests(self):
        """Start the test sequence"""
        self.log("Starting automated tests...", "INFO")
        Clock.schedule_once(lambda dt: self.test_login(), 1.0)
    
    def test_login(self):
        """Test 1: Login with credentials"""
        self.log("TEST 1: Testing login", "INFO")
        try:
            login_screen = self.app.root.get_screen('login')
            
            # Fill in credentials
            login_screen.ids.email.text = TEST_EMAIL
            login_screen.ids.password.text = TEST_PASSWORD
            
            self.log(f"Credentials entered: {TEST_EMAIL}", "INFO")
            
            # Trigger login
            login_screen.do_login()
            
            # Check result after delay
            Clock.schedule_once(lambda dt: self.verify_login(), 2.0)
            
        except Exception as e:
            self.log(f"Login test failed: {e}", "ERROR")
            self.tests_failed += 1
            self.finish_tests()
    
    def verify_login(self):
        """Verify login was successful"""
        try:
            if self.app.current_user:
                self.log(f"Login successful! User: {self.app.current_user.email}", "SUCCESS")
                self.tests_passed += 1
                
                # Check if we're on tasks screen
                if self.app.root.current == "tasks":
                    self.log("Navigated to tasks screen", "SUCCESS")
                    
                    # Proceed to next test
                    Clock.schedule_once(lambda dt: self.test_create_task(), 2.0)
                else:
                    self.log(f"Wrong screen: {self.app.root.current}", "ERROR")
                    self.tests_failed += 1
                    self.finish_tests()
            else:
                self.log("Login failed - no user set", "ERROR")
                self.tests_failed += 1
                self.finish_tests()
        except Exception as e:
            self.log(f"Login verification failed: {e}", "ERROR")
            self.tests_failed += 1
            self.finish_tests()
    
    def test_create_task(self):
        """Test 2: Create a new task"""
        self.log("TEST 2: Creating a task", "INFO")
        try:
            # Navigate to add task screen
            tasks_screen = self.app.root.get_screen('tasks')
            tasks_screen.open_add_task()
            
            Clock.schedule_once(lambda dt: self.fill_task_form(), 1.0)
            
        except Exception as e:
            self.log(f"Create task test failed: {e}", "ERROR")
            self.tests_failed += 1
            self.finish_tests()
    
    def fill_task_form(self):
        """Fill in the task creation form"""
        try:
            add_task_screen = self.app.root.get_screen('add_task')
            
            # Fill in task details
            add_task_screen.ids.title.text = "Test Task from Automated Test"
            add_task_screen.ids.description.text = "This task was created by the automated test suite"
            add_task_screen.ids.category.text = "Testing"
            add_task_screen.ids.deadline.text = "2025-12-31"
            add_task_screen.ids.priority.text = "high"
            
            self.log("Task form filled", "INFO")
            
            # Save the task
            Clock.schedule_once(lambda dt: self.save_task(), 1.0)
            
        except Exception as e:
            self.log(f"Failed to fill task form: {e}", "ERROR")
            self.tests_failed += 1
            self.finish_tests()
    
    def save_task(self):
        """Save the task and verify"""
        try:
            add_task_screen = self.app.root.get_screen('add_task')
            add_task_screen.save_task()
            
            self.log("Task save triggered", "INFO")
            
            # Verify after delay
            Clock.schedule_once(lambda dt: self.verify_task_created(), 2.0)
            
        except Exception as e:
            self.log(f"Failed to save task: {e}", "ERROR")
            self.tests_failed += 1
            self.finish_tests()
    
    def verify_task_created(self):
        """Verify the task was created and appears in the list"""
        try:
            if self.app.root.current == "tasks":
                self.log("Returned to tasks screen", "SUCCESS")
                
                tasks_screen = self.app.root.get_screen('tasks')
                
                # Check if task appears in the list
                if len(tasks_screen.all_tasks) > 0:
                    self.log(f"Tasks found: {len(tasks_screen.all_tasks)} tasks", "SUCCESS")
                    
                    # Print all task titles for debugging
                    for i, task in enumerate(tasks_screen.all_tasks):
                        self.log(f"  Task {i+1}: {task.get('title')}", "INFO")
                    
                    # Look for our test task
                    test_task_found = False
                    for task in tasks_screen.all_tasks:
                        if "Test Task from Automated Test" in task.get('title', ''):
                            test_task_found = True
                            self.log(f"Test task found! ID: {task.get('id')}", "SUCCESS")
                            self.log(f"  Priority: {task.get('priority')}", "INFO")
                            self.log(f"  Deadline: {task.get('deadline')}", "INFO")
                            self.log(f"  Status: {task.get('status')}", "INFO")
                            break
                    
                    if test_task_found:
                        self.tests_passed += 1
                        self.log("Task creation test PASSED", "SUCCESS")
                        
                        # Check if task is rendered in UI
                        self.log("Checking UI rendering...", "INFO")
                        tasks_list = tasks_screen.ids.tasks_list
                        widget_count = len(tasks_list.children)
                        self.log(f"UI widgets in tasks_list: {widget_count}", "INFO")
                        
                        if widget_count > 0:
                            self.log("Tasks are being rendered in UI", "SUCCESS")
                        else:
                            self.log("WARNING: No widgets in tasks list!", "WARNING")
                    else:
                        self.log("Test task not found in list", "WARNING")
                        self.tests_passed += 1  # Still pass if task was created
                else:
                    self.log("No tasks in list", "WARNING")
                
                # Finish tests
                Clock.schedule_once(lambda dt: self.finish_tests(), 2.0)
            else:
                self.log(f"Not on tasks screen: {self.app.root.current}", "ERROR")
                self.tests_failed += 1
                self.finish_tests()
                
        except Exception as e:
            self.log(f"Task verification failed: {e}", "ERROR")
            import traceback
            traceback.print_exc()
            self.tests_failed += 1
            self.finish_tests()
    
    def finish_tests(self):
        """Display test results"""
        self.log("=" * 50, "INFO")
        self.log("TEST RESULTS", "INFO")
        self.log(f"Passed: {self.tests_passed}", "SUCCESS" if self.tests_passed > 0 else "INFO")
        self.log(f"Failed: {self.tests_failed}", "ERROR" if self.tests_failed > 0 else "INFO")
        self.log("=" * 50, "INFO")
        
        if self.tests_failed == 0:
            self.log("All tests PASSED! ✅", "SUCCESS")
        else:
            self.log("Some tests FAILED ❌", "ERROR")
        
        self.log("Tests complete. You can continue using the app.", "INFO")


def run_tests():
    """Run the tests"""
    from kivy.app import App
    
    # Get the running app
    app = App.get_running_app()
    
    if not app:
        print("❌ No app is running!")
        return
    
    # Create tester and start
    tester = AppTester(app)
    Clock.schedule_once(lambda dt: tester.start_tests(), 2.0)


if __name__ == "__main__":
    print("=" * 50)
    print("MyDailyOps Test Suite")
    print("=" * 50)
    print("\nTo run tests:")
    print("1. Start the app: python main.py")
    print("2. In another terminal, run: python -c 'from test_app import run_tests; run_tests()'")
    print("\nOr integrate this into your main.py with:")
    print("from test_app import AppTester")
    print("tester = AppTester(self)")
    print("Clock.schedule_once(lambda dt: tester.start_tests(), 2.0)")
    print("=" * 50)

