# MyDailyOps — Keyboard Shortcuts

**Last Updated:** 2025-12-03

---

## 🎹 Login Screen

| Key | Action |
|-----|--------|
| **TAB** | Switch between Email and Password fields |
| **ENTER** | Move to next field (Email → Password) or Submit login (Password field) |
| **ESC** | (Future) Clear current field |

---

## 🎯 Tasks Screen

| Key | Action | Status |
|-----|--------|--------|
| **CTRL + N** | New Task | 🔄 Planned |
| **CTRL + F** | Toggle Search | 🔄 Planned |
| **CTRL + R** | Refresh Tasks | 🔄 Planned |
| **ESC** | Clear Search / Close Dialogs | 🔄 Planned |
| **↑ / ↓** | Navigate between tasks | 🔄 Planned |
| **ENTER** | Open selected task | 🔄 Planned |
| **DELETE** | Delete selected task | 🔄 Planned |

---

## ✏️ Add/Edit Task Screen

| Key | Action | Status |
|-----|--------|--------|
| **TAB** | Navigate between fields | 🔄 To Implement |
| **CTRL + S** | Save Task | 🔄 Planned |
| **ESC** | Cancel and return | 🔄 Planned |

---

## 🎨 Design Principles

1. **Accessibility First** — All major actions should be keyboard accessible
2. **Standard Conventions** — Use familiar shortcuts (CTRL+N, CTRL+S, etc.)
3. **Visual Feedback** — Show which element has focus
4. **Help Available** — Display shortcuts on hover or in help menu

---

## 📝 Implementation Notes

### Current Implementation (Login Screen)

**TAB Navigation:**
```python
# Handled in login_screen.py
Window.bind(on_key_down=self.on_keyboard_down)

def on_keyboard_down(self, instance, keyboard, keycode, text, modifiers):
    if keycode == 9:  # TAB key
        if self.ids.email.focus:
            self.ids.password.focus = True
        elif self.ids.password.focus:
            self.ids.email.focus = True
```

**ENTER Key:**
```kv
# In login_screen.kv
MDTextField:
    on_text_validate: root.do_login()  # Triggers login
```

**Text Field Settings:**
```kv
MDTextField:
    write_tab: False  # Prevents TAB from being typed
    multiline: False  # Single-line input
```

---

## 🚀 Future Enhancements

### Planned Shortcuts
- **CTRL + /** — Show keyboard shortcuts overlay
- **ALT + 1-9** — Quick filter selection
- **CTRL + P** — Pin/Unpin selected task
- **CTRL + D** — Mark as done/undone
- **F2** — Rename task (quick edit)

### Accessibility
- Screen reader support
- High contrast mode shortcuts
- Adjustable keyboard repeat rate
- Custom shortcut configuration

---

## 💡 Tips

1. **Learn Gradually** — Start with TAB and ENTER, add more as needed
2. **Visual Indicators** — Focus rings show which element is active
3. **Consistency** — Same shortcuts work across all screens
4. **Help Menu** — Access full shortcut list anytime

---

**Status Legend:**
- ✅ Implemented
- 🔄 Planned
- 💡 Under Consideration

