"""
Task Utility Functions

This module contains helper functions for task management:
- Grouping tasks by date
- Sorting tasks
- Priority and status helpers
"""

from datetime import date, datetime, timedelta
from enum import Enum


class TaskPriority(Enum):
    """Task priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class TaskStatus(Enum):
    """Task status values"""
    NEW = "new"
    DONE = "done"


class TaskCategory(Enum):
    """Predefined task categories"""
    WORK = "Work"
    PERSONAL = "Personal"
    HEALTH = "Health"
    FINANCE = "Finance"
    OTHER = "Other"


class TaskFilter(Enum):
    """Available task filters"""
    ALL = "all"
    NEW = "new"
    DONE = "done"
    PINNED = "pinned"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


def parse_deadline(deadline_str):
    """
    Parse deadline string to date object.
    
    Handles multiple formats:
    - YYYY-MM-DD
    - YYYY-MM-DD HH:MM
    - YYYY-MM-DDTHH:MM:SS+TZ (ISO format from database)
    
    Returns: date object or None
    """
    if not deadline_str:
        return None
    
    try:
        # Remove timezone if present
        if 'T' in deadline_str:
            # '2025-12-31T15:30:00+00:00' → '2025-12-31'
            dl_clean = deadline_str.split('T')[0]
            return date.fromisoformat(dl_clean)
        elif ' ' in deadline_str:
            # '2025-12-31 15:30' → date object
            dt = datetime.strptime(deadline_str, "%Y-%m-%d %H:%M")
            return dt.date()
        else:
            # 'YYYY-MM-DD'
            return date.fromisoformat(deadline_str)
    except Exception as e:
        print(f"⚠️ Error parsing deadline '{deadline_str}': {e}")
        return None


def group_tasks_by_date(tasks):
    """
    Group tasks by deadline date.
    
    Groups:
    - Today: Tasks due today
    - Tomorrow: Tasks due tomorrow
    - This Week: Tasks due within 7 days
    - Later: Tasks due beyond 7 days
    - No Deadline: Tasks without deadline
    
    Returns: dict with group names as keys and task lists as values
    """
    groups = {
        "Today": [],
        "Tomorrow": [],
        "This Week": [],
        "Later": [],
        "No Deadline": []
    }

    today = date.today()
    tomorrow = today + timedelta(days=1)
    week_end = today + timedelta(days=7)

    print(f"📊 Grouping {len(tasks)} tasks...")

    for task in tasks:
        dl_str = task.get("deadline")
        
        if not dl_str:
            groups["No Deadline"].append(task)
            print(f"  → Task '{task.get('title')}' → No Deadline")
            continue

        dl_date = parse_deadline(dl_str)
        
        if dl_date is None:
            groups["No Deadline"].append(task)
            continue
        
        print(f"  → Task '{task.get('title')}' deadline: {dl_date}")

        if dl_date == today:
            groups["Today"].append(task)
        elif dl_date == tomorrow:
            groups["Tomorrow"].append(task)
        elif today < dl_date <= week_end:
            groups["This Week"].append(task)
        else:
            groups["Later"].append(task)

    # Print group summary
    for group_name, items in groups.items():
        if items:
            print(f"  📁 {group_name}: {len(items)} tasks")

    return groups


def sort_tasks(tasks):
    """
    Sort tasks by priority order.
    
    Order:
    1. Pinned tasks first
    2. New tasks before done tasks
    3. Priority (high → medium → low)
    4. Created date (newest first)
    
    Returns: sorted list of tasks
    """
    print(f"🔄 Sorting {len(tasks)} tasks...")
    
    def safe_timestamp(ts):
        """Safely parse timestamp with microsecond precision issues"""
        try:
            if '.' in ts and '+' in ts:
                main, tz = ts.rsplit('+', 1)
                date, micro = main.split('.')
                # Fix microsecond precision (must be exactly 6 digits)
                micro = micro.ljust(6, '0')[:6]
                ts = f"{date}.{micro}+{tz}"
            return datetime.fromisoformat(ts).timestamp()
        except:
            return 0.0
    
    sorted_tasks = sorted(
        tasks,
        key=lambda t: (
            not t.get("pinned"),
            t.get("status") == "done",
            {"high": 0, "medium": 1, "low": 2}.get(t.get("priority", "medium"), 1),
            -safe_timestamp(t.get("created_at", "2000-01-01T00:00:00"))
        )
    )
    
    print(f"✅ Tasks sorted")
    return sorted_tasks


def filter_tasks(all_tasks, filter_type):
    """
    Filter tasks based on filter type.
    
    Args:
        all_tasks: list of all tasks
        filter_type: one of TaskFilter enum values (or string)
    
    Returns: filtered list of tasks
    """
    if isinstance(filter_type, str):
        filter_str = filter_type.lower()
    else:
        filter_str = filter_type.value
    
    print(f"🔍 Applying filter: {filter_str} (total tasks: {len(all_tasks)})")
    
    if filter_str == TaskFilter.ALL.value:
        filtered = all_tasks
    elif filter_str == TaskFilter.NEW.value:
        filtered = [t for t in all_tasks if t.get("status") == TaskStatus.NEW.value]
    elif filter_str == TaskFilter.DONE.value:
        filtered = [t for t in all_tasks if t.get("status") == TaskStatus.DONE.value]
    elif filter_str == TaskFilter.PINNED.value:
        filtered = [t for t in all_tasks if t.get("pinned")]
    elif filter_str in [TaskFilter.HIGH.value, TaskFilter.MEDIUM.value, TaskFilter.LOW.value]:
        filtered = [t for t in all_tasks if t.get("priority") == filter_str]
    else:
        filtered = all_tasks
    
    print(f"✅ Filter result: {len(filtered)} tasks")
    return filtered


def get_priority_color(priority):
    """
    Get RGBA color tuple for priority level.
    
    Returns: (r, g, b, a) tuple
    """
    colors = {
        TaskPriority.HIGH.value: (0.96, 0.26, 0.21, 1),    # Red 500
        TaskPriority.MEDIUM.value: (1, 0.6, 0, 1),          # Orange 500
        TaskPriority.LOW.value: (0.3, 0.69, 0.31, 1)        # Green 500
    }
    return colors.get(priority, colors[TaskPriority.MEDIUM.value])


def get_status_icon(task):
    """
    Get icon name for task status.
    
    Returns: icon name string
    """
    if task.get("status") == TaskStatus.DONE.value:
        return "check-circle"
    elif task.get("pinned"):
        return "pin"
    else:
        return "checkbox-blank-circle-outline"


def format_deadline_display(deadline_str):
    """
    Format deadline for display in UI.
    
    Input: YYYY-MM-DD or YYYY-MM-DD HH:MM or ISO format
    Output: Human-readable format (e.g., "Dec 31, 2025" or "Dec 31, 2025 3:30 PM")
    """
    if not deadline_str:
        return ""
    
    try:
        # Parse deadline
        if 'T' in deadline_str:
            dt = datetime.fromisoformat(deadline_str.replace('+00:00', ''))
            return dt.strftime("%b %d, %Y %I:%M %p")
        elif ' ' in deadline_str:
            dt = datetime.strptime(deadline_str, "%Y-%m-%d %H:%M")
            return dt.strftime("%b %d, %Y %I:%M %p")
        else:
            dt = datetime.strptime(deadline_str, "%Y-%m-%d")
            return dt.strftime("%b %d, %Y")
    except Exception as e:
        print(f"⚠️ Error formatting deadline '{deadline_str}': {e}")
        return deadline_str


def get_category_icon(category):
    """
    Get icon name for category.
    
    Returns: icon name string
    """
    icons = {
        TaskCategory.WORK.value: "briefcase",
        TaskCategory.PERSONAL.value: "account",
        TaskCategory.HEALTH.value: "heart-pulse",
        TaskCategory.FINANCE.value: "currency-usd",
        TaskCategory.OTHER.value: "dots-horizontal"
    }
    return icons.get(category, "tag-outline")


def get_category_color(category):
    """
    Get RGBA color tuple for category.
    
    Returns: (r, g, b, a) tuple
    """
    colors = {
        TaskCategory.WORK.value: (0.13, 0.59, 0.95, 1),      # Blue
        TaskCategory.PERSONAL.value: (0.61, 0.15, 0.69, 1),  # Purple
        TaskCategory.HEALTH.value: (0.95, 0.26, 0.21, 1),    # Red
        TaskCategory.FINANCE.value: (0.30, 0.69, 0.31, 1),   # Green
        TaskCategory.OTHER.value: (0.62, 0.62, 0.62, 1)      # Grey
    }
    return colors.get(category, (0.62, 0.62, 0.62, 1))


def get_predefined_categories():
    """
    Get list of predefined category names.
    
    Returns: list of category names
    """
    return [cat.value for cat in TaskCategory]

