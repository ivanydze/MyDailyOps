# Tauri Build Fixes - Common Issues and Solutions

## ⚠️ IMPORTANT
**Пожалуйста, предоставьте полный вывод ошибок компиляции**, чтобы я мог точно исправить проблемы.

Запустите:
```bash
cd apps/desktop
pnpm tauri:build > build-errors.log 2>&1
```

И отправьте содержимое `build-errors.log` или первые 50-100 строк ошибок.

---

## 🔧 Возможные проблемы и исправления

### Проблема 1: Неиспользуемые зависимости
**Признак:** `warning: unused import` или `unused variable`

**Исправление:** Удалить неиспользуемые импорты

---

### Проблема 2: Неправильная инициализация плагинов
**Признак:** `error: no method named 'plugin'` или ошибки инициализации плагинов

**Текущая конфигурация:**
- ✅ SQL plugin подключен правильно
- ✅ Shell plugin подключен правильно
- ⚠️ Проверить версии зависимостей

---

### Проблема 3: Отсутствующие features в Cargo.toml
**Возможные ошибки:** Missing features, undefined references

**Проверьте:**
1. Все features для tauri плагинов указаны
2. Версии совместимы (все v2.0)

---

### Проблема 4: Проблемы с перед сборкой фронтенда
**Признак:** Ошибки в TypeScript/React коде перед Rust компиляцией

**Решение:** Убедиться, что `pnpm build` проходит успешно

---

## 📋 Текущая конфигурация

### Cargo.toml
```toml
[dependencies]
tauri = { version = "2.0", features = [] }
tauri-plugin-shell = "2.0"
tauri-plugin-sql = { version = "2.0", features = ["sqlite"] }
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

### main.rs
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_sql::{Builder as SqlBuilder};

fn main() {
    tauri::Builder::default()
        .plugin(SqlBuilder::default().build())
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## 🔍 Шаги для диагностики

1. **Очистка кеша:**
   ```bash
   cd apps/desktop/src-tauri
   cargo clean
   rm -rf target
   ```

2. **Проверка фронтенда:**
   ```bash
   cd apps/desktop
   pnpm build
   ```

3. **Проверка Rust:**
   ```bash
   cd apps/desktop/src-tauri
   cargo check
   ```

4. **Полная сборка:**
   ```bash
   cd apps/desktop
   pnpm tauri:build
   ```

---

## ⏳ Ожидаю

**Полный вывод ошибок компиляции** для точного исправления.

