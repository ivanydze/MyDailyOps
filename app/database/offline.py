"""
SQLite offline cache for MyDailyOps.

Provides local storage for tasks with sync queue for offline-first functionality.
"""

import sqlite3
import json
from pathlib import Path
from datetime import datetime


# Database paths
DB_DIR = Path("app/local")
DB_FILE = DB_DIR / "cache.db"


def init_db():
    """
    Initialize SQLite database with required tables.
    Creates tables if they don't exist.
    """
    # Ensure directory exists
    DB_DIR.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Tasks cache table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks_cache (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            title TEXT,
            description TEXT,
            priority TEXT,
            category TEXT,
            deadline TEXT,
            status TEXT,
            pinned INTEGER,
            created_at TEXT,
            updated_at TEXT,
            synced INTEGER DEFAULT 1
        )
    """)
    
    # Pending updates queue
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pending_updates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id TEXT,
            operation TEXT,
            payload TEXT,
            timestamp TEXT
        )
    """)
    
    conn.commit()
    conn.close()
    
    print(f"✅ SQLite database initialized: {DB_FILE}")


def cache_replace_all(tasks_list):
    """
    Replace all cached tasks with new list from Supabase.
    Used after successful pull from server.
    
    Args:
        tasks_list: List of task dictionaries from Supabase
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    try:
        # Clear existing cache
        cursor.execute("DELETE FROM tasks_cache")
        
        # Insert all tasks
        for task in tasks_list:
            cursor.execute("""
                INSERT INTO tasks_cache 
                (id, user_id, title, description, priority, category, deadline, status, pinned, created_at, updated_at, synced)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            """, (
                task.get("id"),
                task.get("user_id"),
                task.get("title"),
                task.get("description"),
                task.get("priority", "medium"),
                task.get("category", ""),
                task.get("deadline"),
                task.get("status", "new"),
                1 if task.get("pinned", False) else 0,
                task.get("created_at"),
                task.get("updated_at"),
            ))
        
        conn.commit()
        print(f"✅ Cached {len(tasks_list)} tasks to SQLite")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error caching tasks: {e}")
        
    finally:
        conn.close()


def cache_get_all():
    """
    Get all tasks from local cache.
    Returns list of task dictionaries.
    """
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT * FROM tasks_cache ORDER BY created_at DESC")
        rows = cursor.fetchall()
        
        # Convert to list of dicts
        tasks = []
        for row in rows:
            task = {
                "id": row["id"],
                "user_id": row["user_id"],
                "title": row["title"],
                "description": row["description"],
                "priority": row["priority"],
                "category": row["category"],
                "deadline": row["deadline"],
                "status": row["status"],
                "pinned": bool(row["pinned"]),
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
            }
            tasks.append(task)
        
        print(f"✅ Loaded {len(tasks)} tasks from SQLite cache")
        return tasks
        
    except Exception as e:
        print(f"❌ Error loading from cache: {e}")
        return []
        
    finally:
        conn.close()


def cache_upsert(task):
    """
    Insert or update a task in the cache.
    
    Args:
        task: Task dictionary
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT OR REPLACE INTO tasks_cache 
            (id, user_id, title, description, priority, category, deadline, status, pinned, created_at, updated_at, synced)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        """, (
            task.get("id"),
            task.get("user_id"),
            task.get("title"),
            task.get("description"),
            task.get("priority", "medium"),
            task.get("category", ""),
            task.get("deadline"),
            task.get("status", "new"),
            1 if task.get("pinned", False) else 0,
            task.get("created_at"),
            task.get("updated_at", datetime.utcnow().isoformat()),
        ))
        
        conn.commit()
        print(f"✅ Task cached: {task.get('title')}")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error caching task: {e}")
        
    finally:
        conn.close()


def cache_delete(task_id):
    """
    Delete a task from the cache.
    
    Args:
        task_id: Task ID to delete
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    try:
        cursor.execute("DELETE FROM tasks_cache WHERE id = ?", (task_id,))
        conn.commit()
        print(f"✅ Task deleted from cache: {task_id}")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error deleting from cache: {e}")
        
    finally:
        conn.close()


def add_pending_update(operation, task):
    """
    Add an operation to the pending updates queue.
    
    Args:
        operation: "create", "update", or "delete"
        task: Task dictionary or task_id for delete
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    try:
        task_id = task if operation == "delete" else task.get("id")
        payload = task_id if operation == "delete" else json.dumps(task)
        
        cursor.execute("""
            INSERT INTO pending_updates (task_id, operation, payload, timestamp)
            VALUES (?, ?, ?, ?)
        """, (
            task_id,
            operation,
            payload,
            datetime.utcnow().isoformat()
        ))
        
        conn.commit()
        print(f"✅ Queued {operation} for task: {task_id}")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error queuing update: {e}")
        
    finally:
        conn.close()


def pop_pending_updates():
    """
    Get all pending updates and remove them from queue.
    Returns list of update dictionaries.
    """
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # Get all pending updates
        cursor.execute("SELECT * FROM pending_updates ORDER BY timestamp ASC")
        rows = cursor.fetchall()
        
        updates = []
        for row in rows:
            update = {
                "id": row["id"],
                "task_id": row["task_id"],
                "operation": row["operation"],
                "payload": json.loads(row["payload"]) if row["operation"] != "delete" else row["payload"],
                "timestamp": row["timestamp"]
            }
            updates.append(update)
        
        # Clear pending updates
        if updates:
            cursor.execute("DELETE FROM pending_updates")
            conn.commit()
            print(f"✅ Popped {len(updates)} pending updates")
        
        return updates
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error popping updates: {e}")
        return []
        
    finally:
        conn.close()


def get_pending_count():
    """
    Get count of pending updates in queue.
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT COUNT(*) FROM pending_updates")
        count = cursor.fetchone()[0]
        return count
        
    except Exception as e:
        print(f"❌ Error getting pending count: {e}")
        return 0
        
    finally:
        conn.close()

