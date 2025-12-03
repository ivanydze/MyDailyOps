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

### Task Management
- Create, edit, delete tasks
- Mark as Done / Pending
- Pin / Unpin
- Assign priority, category, deadline

### Organisation & UX
- **Date grouping:** Today, Tomorrow, This Week, Later, No Deadline
- **Filtering:** All, New, Done, Pinned, Priority
- **Sorting:** Pinned → Status → Priority → Created
- **Real-time search**
- **Swipe actions (MD3):** Left = Done, Right = Edit/Delete

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

## 🔧 Material 3 Migration Notes

- Old widgets removed (MDToolbar, MDRaisedButton, etc.)
- Uses **MDTopAppBar**, **MDButton(style=...)**, MD3 typography
- **Swipe now uses MDSwipeItem**, not legacy SwiperItem
- ScrollView lists require:
  - `size_hint_y: None`
  - `height: self.minimum_height`

---

## ▶ Running the App

```
.\venv\Scripts\activate
python main.py
```

Window target size: **430×720**

---

## 📌 Current Status (2025-12-03)

- MD3 migration — **DONE**
- TaskCard swipe rewrite — **DONE**
- Black screen issue — **FIXED**
- Grouping / Search / Filter / Sort — **WORKING**
- UI polish — **IN PROGRESS**
