# Problem 10: Weekly Checklists - Implementation Plan

## Требования

Weekly Checklists должны:
- Существовать одну неделю
- Сохраняться в истории в конце недели
- Генерировать новый инстанс на следующей неделе
- Редактирование нового чеклиста не изменяет прошлые
- Это НЕ задачи: нет deadlines, recurring, duration

## Архитектура

### 1. База данных

**Таблица: `weekly_checklists`**
```sql
CREATE TABLE weekly_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,  -- Первый день недели (воскресенье или понедельник)
  week_end_date DATE NOT NULL,    -- Последний день недели
  title TEXT,                      -- Название чеклиста (опционально)
  items JSONB NOT NULL,            -- Массив чеклист айтемов
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start_date) -- Один чеклист на неделю на пользователя
);
```

**Структура items (JSONB):**
```json
[
  {
    "id": "uuid",
    "text": "Check item text",
    "completed": false,
    "created_at": "2025-01-15T10:00:00Z"
  }
]
```

**Индексы:**
- `(user_id, week_start_date)` - для быстрого поиска текущей недели
- `(user_id, week_start_date DESC)` - для истории

### 2. Week Detection Logic

**Важно:** Нужно решить, неделя начинается с воскресенья или понедельника.

**Вариант 1 (США):** Воскресенье = первый день
**Вариант 2 (ISO/Европа):** Понедельник = первый день

**Рекомендация:** Использовать настройку пользователя или по умолчанию воскресенье (как в Calendar).

Функции:
- `getWeekStartDate(date: Date, weekStartsOn: 0 | 1): Date` - получить начало недели
- `getWeekEndDate(date: Date, weekStartsOn: 0 | 1): Date` - получить конец недели
- `getCurrentWeekKey(date: Date, weekStartsOn: 0 | 1): string` - ключ недели (YYYY-MM-DD)
- `isSameWeek(date1: Date, date2: Date, weekStartsOn: 0 | 1): boolean` - сравнение недель

### 3. Генерация нового чеклиста

**Логика:**
1. При открытии Weekly Checklists проверяется текущая неделя
2. Если чеклист для текущей недели существует → показываем его
3. Если нет → создаем новый пустой чеклист
4. При переходе на новую неделю:
   - Старый чеклист остается в истории (не изменяется)
   - Для новой недели создается новый пустой чеклист

**Автоматическая генерация:**
- Можно делать при первом открытии UI
- Или в фоне при смене недели (но не критично)

### 4. История

**Хранение:**
- Все чеклисты остаются в таблице `weekly_checklists`
- Для истории фильтруем по `week_start_date < current_week_start`

**UI для истории:**
- Список прошлых недель
- Просмотр readonly чеклистов прошлых недель
- Возможно, статистика (сколько выполнено за неделю)

### 5. Sync Integration

**Логика синхронизации:**
- Weekly Checklists синхронизируются как отдельная сущность
- Pull: загружаем все чеклисты пользователя
- Push: отправляем изменения текущей недели
- Конфликты: server wins (так как чеклисты недельные и не должны конфликтовать)

**Хранение локально:**
- Desktop: SQLite таблица `weekly_checklists`
- Mobile: SQLite таблица `weekly_checklists`
- Browser: localStorage (или пропустить для browser mode)

### 6. UI Components

**Desktop:**
- `WeeklyChecklist.tsx` - основной компонент
- `ChecklistItem.tsx` - элемент чеклиста (checkbox + text)
- `WeeklyChecklistHistory.tsx` - история прошлых недель
- Route: `/weekly-checklist`

**Mobile:**
- `WeeklyChecklistScreen.tsx` - экран чеклиста
- `ChecklistItem.tsx` - элемент (React Native)
- Route: `/weekly-checklist`

**Функциональность:**
- Добавление/удаление айтемов
- Отметка как выполненное
- Редактирование текста айтема
- Автосохранение при изменениях
- Переключение между текущей неделей и историей

### 7. Navigation

**Desktop:**
- Добавить ссылку в Sidebar: "Weekly Checklist" с иконкой ListChecks
- Или можно добавить в Today view как секцию

**Mobile:**
- Добавить в Dashboard как карточку
- Или отдельный таб в навигации

## Порядок реализации

### Phase 1: Database Schema & Migration
1. Создать миграцию для `weekly_checklists` таблицы
2. Добавить RLS политики (только свой user_id)
3. Создать SQLite схему для Desktop/Mobile

### Phase 2: Week Utilities
1. Создать `utils/week.ts` с функциями для работы с неделями
2. Тесты для week detection

### Phase 3: Core Logic
1. Создать `utils/weeklyChecklist.ts` для генерации и работы с чеклистами
2. Функции: `getCurrentWeekChecklist()`, `createNewWeekChecklist()`, `saveChecklist()`

### Phase 4: Store/Hooks
1. Desktop: `stores/weeklyChecklistStore.ts` (Zustand)
2. Mobile: `hooks/useWeeklyChecklist.ts`
3. CRUD операции через store/hook

### Phase 5: Sync Integration
1. Добавить `pullWeeklyChecklists()` и `pushWeeklyChecklist()` в syncService
2. Интеграция с существующим sync flow

### Phase 6: UI Components (Desktop)
1. Создать `WeeklyChecklist.tsx` компонент
2. Создать `ChecklistItem.tsx`
3. Интеграция с store
4. Добавить route и navigation

### Phase 7: UI Components (Mobile)
1. Создать `WeeklyChecklistScreen.tsx`
2. Адаптировать компоненты для React Native
3. Добавить navigation

### Phase 8: History View
1. Создать компонент истории
2. Показывать прошлые недели readonly
3. Статистика выполнения

### Phase 9: Tests
1. Тесты для week utilities
2. Тесты для checklist logic
3. Тесты для sync

## Детали реализации

### Week Start Day
Используем воскресенье (0) как в Calendar View, но можно сделать настраиваемым позже.

### Checklist Items Structure
```typescript
interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  created_at: string;
}
```

### Checklist Interface
```typescript
interface WeeklyChecklist {
  id: string;
  user_id: string;
  week_start_date: string; // ISO date
  week_end_date: string;   // ISO date
  title?: string;
  items: ChecklistItem[];
  created_at: string;
  updated_at: string;
}
```

### Auto-save
При изменении чеклиста автоматически сохранять через debounce (500ms).

### Performance
- Кешировать текущий чеклист в store
- Загружать историю lazy (только при открытии истории)
- Использовать индексы для быстрого поиска

