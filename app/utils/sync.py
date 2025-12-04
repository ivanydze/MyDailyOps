"""
Cloud sync for MyDailyOps offline-first system.

Handles bidirectional sync between SQLite cache and Supabase.
"""

import sqlite3
import json
from app.supabase.client import supabase
from app.database.offline import (
    cache_replace_all,
    pop_pending_updates,
    get_pending_count,
    DB_FILE
)
from kivy.app import App


def pull_from_supabase(user_id):
    """
    Pull tasks from Supabase and update local cache.
    
    Args:
        user_id: Current user ID
        
    Returns:
        True if successful, False otherwise
    """
    try:
        print("⬇️ Pulling tasks from Supabase...")
        
        # Fetch all tasks from Supabase
        response = supabase.table("tasks") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("deleted", False) \
            .order("created_at", desc=True) \
            .execute()
        
        if response.data:
            tasks = response.data
            
            # Update local cache with server data
            cache_replace_all(tasks)
            
            print(f"✅ Pulled {len(tasks)} tasks from Supabase")
            return True
        else:
            print("ℹ️ No tasks found on server")
            return True
            
    except Exception as e:
        print(f"❌ Error pulling from Supabase: {e}")
        return False


def push_to_supabase():
    """
    Push pending updates to Supabase.
    
    Returns:
        True if successful, False otherwise
    """
    try:
        pending_count = get_pending_count()
        
        if pending_count == 0:
            print("ℹ️ No pending updates to push")
            return True
        
        print(f"⬆️ Pushing {pending_count} updates to Supabase...")
        
        # Get all pending updates
        updates = pop_pending_updates()
        
        success_count = 0
        failed_updates = []
        
        for update in updates:
            operation = update["operation"]
            task_id = update["task_id"]
            
            try:
                if operation == "create":
                    # Insert new task
                    payload = update["payload"]
                    response = supabase.table("tasks").insert(payload).execute()
                    if response.data:
                        success_count += 1
                        print(f"  ✅ Created: {payload.get('title')}")
                    
                elif operation == "update":
                    # Update existing task
                    payload = update["payload"]
                    response = supabase.table("tasks") \
                        .update(payload) \
                        .eq("id", task_id) \
                        .execute()
                    if response.data:
                        success_count += 1
                        print(f"  ✅ Updated: {task_id}")
                    
                elif operation == "delete":
                    # Soft delete task
                    response = supabase.table("tasks") \
                        .update({"deleted": True}) \
                        .eq("id", task_id) \
                        .execute()
                    if response.data:
                        success_count += 1
                        print(f"  ✅ Deleted: {task_id}")
                        
            except Exception as e:
                print(f"  ❌ Failed {operation} for {task_id}: {e}")
                failed_updates.append(update)
        
        # Re-queue failed updates
        if failed_updates:
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            for update in failed_updates:
                cursor.execute("""
                    INSERT INTO pending_updates (task_id, operation, payload, timestamp)
                    VALUES (?, ?, ?, ?)
                """, (
                    update["task_id"],
                    update["operation"],
                    json.dumps(update["payload"]) if update["operation"] != "delete" else update["payload"],
                    update["timestamp"]
                ))
            conn.commit()
            conn.close()
            print(f"⚠️ Re-queued {len(failed_updates)} failed updates")
        
        print(f"✅ Push complete: {success_count}/{len(updates)} succeeded")
        return success_count > 0 or len(updates) == 0
        
    except Exception as e:
        print(f"❌ Error pushing to Supabase: {e}")
        return False


def sync_now(user_id):
    """
    Perform full bidirectional sync: push → pull.
    
    Args:
        user_id: Current user ID
        
    Returns:
        True if successful, False otherwise
    """
    print("\n🔄 Starting sync...")
    
    # Step 1: Push local changes to server
    push_success = push_to_supabase()
    
    # Step 2: Pull latest from server
    pull_success = pull_from_supabase(user_id)
    
    if push_success and pull_success:
        print("✅ Sync completed successfully\n")
        return True
    else:
        print("⚠️ Sync completed with errors\n")
        return False

