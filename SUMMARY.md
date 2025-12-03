# MyDailyOps — Project Summary

MyDailyOps is a modern desktop application for personal task management built with **Python, KivyMD (Material 3), and Supabase**. The application focuses on clean architecture, stability, and a polished Material Design user experience.

---

## 🚀 Core Tech Stack

| Layer | Technology |
|-------|------------|
| **UI Framework** | Kivy + KivyMD 2.0.1.dev0 (Material You / MD3) |
| **Backend** | Supabase (PostgreSQL + Auth) |
| **Auth** | Supabase Auth (email/password) |
| **Notifications** | win10toast (Windows 10 native toasts) |
| **Platform** | Windows 10, Python 3.10+ |

---

## 📁 Project Structure

```
MyDailyOps/
├── main.py
├── app/
│   ├── screens/
│   │   ├── login_screen.py
│   │   ├── tasks_screen.py
│   │   ├── add_task_screen.py
│   │   ├── edit_task_screen.py
│   │   ├── task_details_screen.py
│   │   └── home_screen.py (unused)
│   │
│   ├── ui/
│   │   ├── login_screen.kv
│   │   ├── tasks_screen.kv
│   │   ├── add_task_screen.kv
│   │   ├── edit_task_screen.kv
│   │   └── task_details_screen.kv
│   │
│   ├── widgets/
│   │   ├── task_card.py
│   │   └── task_card.kv
│   │
│   ├── supabase/
│   │   └── client.py
│   │
│   ├── utils/
│   │   ├── notifier.py
│   │   └── helpers.py
│   │
│   └── database/
│
└── venv/
```

---

## 🌟 Major Features

### Authentication
- Email/password login with Supabase
- Session stored in `app.current_user`
- Material 3 login screen with proper text field styling
- Keyboard navigation (TAB between fields, ENTER to submit)
- Helper text and error messages
- Toast notifications for login success/failure

### Task Management
- Create, edit, delete tasks
- Mark as Done / Pending
- Pin / Unpin
- Assign priority (dropdown menu: Low/Medium/High)
- Set category and description
- Set deadline with Material 3 date picker
- Automatic field clearing and validation
- Toast notifications for all actions

### Organisation & UX
- **Date grouping:** Today, Tomorrow, This Week, Later, No Deadline
- **Filtering:** All, New, Done, Pinned, Priority (with filter banner)
- **Sorting:** Pinned → Status → Priority → Created
- **Real-time search** with expandable search field
- **Task actions:** Always-visible buttons for mark done, edit, and delete
- **FAB button:** Quick add task from bottom-right corner

### Notifications
- Deadline notifications
- Task completion toasts

---

## 🗄 Supabase Table Schema (`tasks`)

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to auth.users |
| title | string | Required |
| description | string | Optional |
| category | string | Optional |
| deadline | date | YYYY-MM-DD |
| priority | enum(high/medium/low) |
| status | enum(new/done) |
| pinned | boolean |  |
| created_at | timestamp |  |
| updated_at | timestamp |  |

---

## 🔧 Material 3 Implementation Notes

### Widgets Used (KivyMD 2.0.1.dev0)
- **MDTopAppBar** for app bar (replaces MDToolbar)
- **MDCard** for task cards (base widget)
- **MDFabButton** for floating action button
- **MDButton**, **MDIconButton** for actions
- **MDLabel** with separate `font_style` and `role` properties
- **MDTextField** with **MDTextFieldHintText** and **MDTextFieldHelperText** child widgets

### Typography (KivyMD 2.0 Format)
```kv
# Correct format for labels
font_style: "Body"  # Options: Display, Headline, Title, Body, Label
role: "large"       # Options: large, medium, small
```

### Text Fields (KivyMD 2.0 Format)
```kv
# Must use child widgets, NOT properties
MDTextField:
    mode: "outlined"
    write_tab: False  # Allow TAB navigation
    
    MDTextFieldHintText:
        text: "Placeholder text"
    
    MDTextFieldHelperText:
        text: "Helper text"
        mode: "on_focus"
```

### ScrollView Lists
- Require `size_hint_y: None`
- Require `height: self.minimum_height`
- Child widgets need `adaptive_height: True` or fixed height

---

## ▶ Running the App

### Windows (Recommended)
```batch
run.bat
```

### Manual
```batch
.\venv\Scripts\activate
python main.py
```

Window target size: **400×700 pixels**

---

## 📌 Current Status (2025-12-03)

### ✅ Completed Features

**Core Functionality:**
- ✅ MD3 migration to KivyMD 2.0.1.dev0
- ✅ Login Screen with Material 3 design
  - Proper text field styling (MDTextFieldHintText)
  - Keyboard navigation (TAB and ENTER)
  - Helper text and error messages
  - Toast notifications
- ✅ Add Task Screen
  - Material 3 styling with visible placeholders
  - TAB navigation between all fields
  - Date + Time picker (chained: date first, then time)
  - Priority dropdown menu (Low/Medium/High)
  - Input validation and error handling
  - Auto-clear fields, toast notifications
- ✅ Edit Task Screen
  - Material 3 styling matching Add Task screen
  - TAB navigation between all fields
  - Date + Time picker (chained: date first, then time)
  - Priority dropdown menu (Low/Medium/High)
  - Handles timezone format from database (displays as YYYY-MM-DD HH:MM)
  - Updates updated_at timestamp
- ✅ TaskCard implementation with MDCard
  - Priority color indicator (vertical bar)
  - Pin icon for pinned tasks
  - Ripple effects on all buttons
  - Proper MD3 typography (font_style + role)
  - Always-visible action buttons (status, edit, delete)
- ✅ Black screen issue — FIXED
- ✅ Grouping / Search / Filter / Sort — WORKING
  
**UI Enhancements:**
- ✅ FAB (MDFabButton) for quick task creation
- ✅ Filter banner showing active filter
- ✅ Empty state with helpful message
- ✅ Improved spacing and MD3 colors
- ✅ Group headers with task counts
- ✅ Expandable search field

**Code Quality:**
- ✅ Error handling with try/except blocks
- ✅ User-friendly toast notifications
- ✅ Proper separation of concerns (Python + KV)
- ✅ Launcher script (run.bat) for easy startup
- ✅ Keyboard event handling for accessibility (TAB navigation)
- ✅ Automated test suite (test_app.py) for quality assurance
- ✅ Debug logging for troubleshooting

### 🎯 Working Features
- Login/Authentication with Supabase
- Task CRUD operations
- Date-based grouping
- Priority filtering (High/Medium/Low)
- Status filtering (All/New/Done/Pinned)
- Real-time search
- Deadline notifications
- Task completion toasts

### 📋 Next Steps
1. **User Testing** — Follow TESTING_CHECKLIST.md
2. **Bug Fixes** — Address any issues found
3. **Add/Edit Task Screen** validation improvements
4. **Offline Mode** — SQLite cache + background sync

### 🐛 Known Issues
- None currently (app launches and runs successfully)
