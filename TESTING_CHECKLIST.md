# MyDailyOps — Testing Checklist

**Date:** 2025-12-03  
**Version:** After TaskCard MD3 Refactor

---

## 🎯 What Was Implemented

### TaskCard (MDSwipeItem) — COMPLETED
✅ Refactored TaskCard to properly use KV layout  
✅ Added Material 3 design with proper colors and spacing  
✅ Implemented SwipeLeft (mark done/undone) with green background  
✅ Implemented SwipeRight (edit/delete) with blue background  
✅ Added ripple effects to all icon buttons (ripple_scale: 1.5-2)  
✅ Added priority color indicator (vertical colored bar)  
✅ Added pin icon indicator for pinned tasks  
✅ Improved typography with proper MD3 font styles  
✅ Added opacity effect for completed tasks  

### TasksScreen UI — COMPLETED
✅ Added Floating Action Button (FAB) for adding tasks  
✅ Improved top app bar with refresh button  
✅ Added filter banner that shows active filter  
✅ Added empty state with icon and helpful message  
✅ Improved group headers with task count  
✅ Better spacing and padding throughout  
✅ Proper Material 3 color scheme  

### Error Handling — COMPLETED
✅ Added try/except blocks around Supabase operations  
✅ User-friendly toast notifications for errors  
✅ Better feedback messages for all actions  

---

## ✅ Manual Testing Checklist

### 1. TaskCard Visual Tests
- [ ] Launch app and login
- [ ] Verify TaskCard displays correctly with:
  - [ ] Priority color bar (left side)
  - [ ] Status icon (checkbox/check/pin)
  - [ ] Task title (bold, proper size)
  - [ ] Subtitle with priority, status, deadline
  - [ ] Pin icon appears for pinned tasks
  - [ ] Completed tasks have reduced opacity

### 2. Swipe Left (Mark Done)
- [ ] Swipe left on a pending task
- [ ] Verify green background appears
- [ ] Tap the check icon
- [ ] Verify task is marked as done
- [ ] Verify toast notification appears: "Task Completed ✓"
- [ ] Verify task opacity reduces
- [ ] Swipe left on a completed task
- [ ] Verify restore icon appears
- [ ] Tap to restore
- [ ] Verify toast: "Task Restored"

### 3. Swipe Right (Edit/Delete)
- [ ] Swipe right on any task
- [ ] Verify blue background with two icons (pencil, delete)
- [ ] Tap pencil icon
- [ ] Verify EditTaskScreen opens
- [ ] Go back to tasks
- [ ] Swipe right on another task
- [ ] Tap delete icon
- [ ] Verify task is deleted
- [ ] Verify toast: "Task Deleted"

### 4. FAB (Floating Action Button)
- [ ] Verify FAB appears in bottom-right corner
- [ ] Tap FAB
- [ ] Verify AddTaskScreen opens
- [ ] Add a new task
- [ ] Verify you return to TasksScreen
- [ ] Verify new task appears in list

### 5. Search Functionality
- [ ] Tap search icon (magnifying glass)
- [ ] Verify search field expands smoothly
- [ ] Type a search query
- [ ] Verify tasks filter in real-time
- [ ] Clear search
- [ ] Verify all tasks return
- [ ] Tap search icon again to collapse

### 6. Filter Functionality
- [ ] Tap filter icon
- [ ] Select "High" priority
- [ ] Verify filter banner appears: "Filtered: High"
- [ ] Verify only high-priority tasks show
- [ ] Tap X on filter banner
- [ ] Verify filter clears
- [ ] Test other filters: New, Done, Pinned, Medium, Low

### 7. Group Headers
- [ ] Verify tasks are grouped by date
- [ ] Verify each group shows count: "Today (3)"
- [ ] Verify groups appear in order:
  - Today
  - Tomorrow
  - This Week
  - Later
  - No Deadline

### 8. Empty State
- [ ] Apply a filter with no results (e.g., filter by "High" when none exist)
- [ ] Verify empty state appears with:
  - [ ] Icon (clipboard-text-off-outline)
  - [ ] "No tasks found" message
  - [ ] Helpful hint about adding tasks

### 9. Multiple Tasks Test
- [ ] Create 5+ tasks with different:
  - [ ] Priorities (high, medium, low)
  - [ ] Deadlines (today, tomorrow, next week)
  - [ ] Some pinned, some not
  - [ ] Some done, some pending
- [ ] Verify all render correctly
- [ ] Test swipe on multiple tasks in sequence
- [ ] Verify no performance issues
- [ ] Verify animations are smooth

### 10. Error Handling
- [ ] Disconnect from internet
- [ ] Try to load tasks
- [ ] Verify error toast appears
- [ ] Try to mark task as done
- [ ] Verify error toast appears
- [ ] Reconnect internet
- [ ] Tap refresh button
- [ ] Verify tasks load successfully

---

## 🐛 Known Issues (If Any)

None currently reported. Add any issues found during testing here.

---

## 📊 Test Results

**Tested By:** _[Your Name]_  
**Date:** _[Date]_  
**Platform:** Windows 10/11  
**Python Version:** _[Version]_

### Summary
- [ ] All visual elements render correctly
- [ ] All swipe gestures work as expected
- [ ] All buttons and interactions respond properly
- [ ] No crashes or errors during testing
- [ ] Performance is acceptable

### Issues Found
1. _[List any issues]_

---

## 🎉 Sign Off

**Developer:** Ready for user testing  
**QA:** _[Approved/Issues Found]_  
**Date:** _[Date]_

