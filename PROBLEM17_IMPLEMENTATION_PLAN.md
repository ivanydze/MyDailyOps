# Problem 17: Timezone-Safe Task Time - Implementation Plan

## Требования

### Проблема
Календарные приложения автоматически смещают время события при смене часового пояса пользователя → хаос.

### Решение
Каждая задача хранит:
- `event_time` - время события (HH:mm, например "14:00")
- `event_timezone` - часовой пояс (IANA timezone, например "Europe/London")

Время НИКОГДА не должно автоматически корректироваться.

### UI Отображение
```
14:00 (UK)
06:00 Local
```
Когда пользователь возвращается в UK, оба значения показывают 14:00 снова.

## Архитектура

### 1. Database Schema

#### Supabase Migration
```sql
ALTER TABLE tasks ADD COLUMN event_time TIME;
ALTER TABLE tasks ADD COLUMN event_timezone TEXT; -- IANA timezone identifier

-- Index для поиска по времени
CREATE INDEX idx_tasks_event_time ON tasks(event_time) WHERE event_time IS NOT NULL;
```

#### Desktop SQLite
- Добавить `event_time TEXT` (HH:mm format)
- Добавить `event_timezone TEXT` (IANA timezone)
- Миграция для существующих задач

#### Mobile SQLite
- Аналогично Desktop

### 2. Data Model

#### Extend Task Interface
```typescript
interface Task {
  // ... existing fields
  deadline?: string; // ISO date string (YYYY-MM-DD)
  event_time?: string; // HH:mm format (e.g., "14:00")
  event_timezone?: string; // IANA timezone (e.g., "Europe/London")
}
```

### 3. Core Logic

#### Utility Functions (apps/desktop/src/utils/timezone.ts)
- `formatEventTime(task: Task, localTimezone: string): string` - форматирует время для отображения
- `getEventTimeInTimezone(eventTime: string, eventTimezone: string, targetTimezone: string): string` - конвертирует время между таймзонами
- `getCurrentTimezone(): string` - получает текущий таймзон пользователя
- `formatTimeWithTimezone(time: string, timezone: string, localTimezone: string): { original: string, local: string }`

### 4. UI Components

#### Task Creation/Edit Forms
- Добавить time picker для `event_time`
- Добавить timezone picker для `event_timezone`
- Отображать: "14:00 (UK)" и "06:00 Local" рядом

#### Task Display (TaskCard, Calendar views)
- Показывать время с таймзоной
- Показывать локальное время рядом (если отличается)

#### Settings
- Настройка default timezone для новых задач

### 5. Sync
- Сохранять `event_time` и `event_timezone` при синхронизации
- Не конвертировать время при синхронизации

### 6. Backward Compatibility
- Существующие задачи без `event_time` работают как раньше
- При создании новой задачи с deadline, можно опционально добавить время

## Фазы реализации

### Phase 1: Database Schema & Migration
1. Создать Supabase migration
2. Обновить Desktop SQLite schema
3. Обновить Mobile SQLite schema
4. Добавить миграции для существующих данных

### Phase 2: Core Utilities
1. Создать `utils/timezone.ts` с утилитами
2. Добавить тесты для timezone логики

### Phase 3: Extend Task Model
1. Обновить типы Task (добавить event_time, event_timezone)
2. Обновить создание/чтение задач в БД

### Phase 4: UI - Task Forms
1. Добавить time picker в EditTask / NewTask
2. Добавить timezone picker
3. Обновить валидацию

### Phase 5: UI - Task Display
1. Обновить TaskCard для отображения времени с таймзоной
2. Обновить Calendar views
3. Обновить другие компоненты отображения задач

### Phase 6: Settings
1. Добавить default timezone настройку
2. UI для выбора default timezone

### Phase 7: Sync Integration
1. Обновить sync сервисы (Desktop & Mobile)
2. Убедиться что event_time и event_timezone синхронизируются

### Phase 8: Tests
1. Unit tests для timezone утилит
2. Integration tests для UI
3. Tests для sync

## Зависимости

- `date-fns-tz` для работы с таймзонами (или использовать Intl API)
- Возможно нужен timezone picker библиотека (или сделать простой список популярных таймзон)

## Важные замечания

1. `event_time` НЕ связано с `deadline` напрямую
   - `deadline` остается датой (без времени)
   - `event_time` - это опциональное время события
   - `event_timezone` - таймзон для этого времени

2. Если задача имеет `deadline` но не имеет `event_time`, она работает как раньше

3. Время никогда не конвертируется автоматически - хранится как есть

4. UI показывает оба времени: оригинальное и локальное (если отличается)

