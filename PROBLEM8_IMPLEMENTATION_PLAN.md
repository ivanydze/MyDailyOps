# Problem 8: Weekends Visibility Control - Implementation Plan

## Требования

1. **Главная настройка**: Show tasks on weekends: ON/OFF
2. **Если OFF**, можно выбрать:
   - Какие категории скрывать (Work, Finance, Personal, etc.)
   - Какие приоритеты скрывать (low, medium)
3. **Высокоприоритетные задачи (high) ВСЕГДА видны** - независимо от фильтра
4. **Calendar & Upcoming игнорируют фильтр** - показывают все задачи

## План реализации

### Шаг 1: Settings Store
- Создать `settingsStore.ts` с Zustand
- Хранить настройки в localStorage
- Настройки:
  - `showTasksOnWeekends: boolean` (default: true)
  - `hiddenCategoriesOnWeekends: string[]` (default: [])
  - `hiddenPrioritiesOnWeekends: ('low' | 'medium')[]` (default: [])

### Шаг 2: Weekend Detection Utility
- Функция `isWeekend(date: Date): boolean`
- Проверяет: день недели = Saturday (6) или Sunday (0)
- Использует timezone-stable `startOfDay()`

### Шаг 3: Weekend Filter Function
- Функция `shouldShowTaskOnWeekend(task: Task, settings: WeekendSettings): boolean`
- Логика:
  - Если `showTasksOnWeekends === true` → всегда true
  - Если `task.priority === 'high'` → всегда true
  - Если сегодня выходной:
    - Проверить категорию (если в hiddenCategoriesOnWeekends → false)
    - Проверить приоритет (если в hiddenPrioritiesOnWeekends → false)
  - Иначе → true

### Шаг 4: Update Today View
- Применить weekend filter после visibility filter
- Использовать функцию `shouldShowTaskOnWeekend()`

### Шаг 5: Update Upcoming View
- **НЕ применять weekend filter** (требование: Upcoming игнорирует фильтр)

### Шаг 6: Settings UI
- Создать Settings screen или добавить в существующий Settings
- Toggle для "Show tasks on weekends"
- Multi-select для категорий (если OFF)
- Multi-select для приоритетов (если OFF)
- Сохранение в settingsStore

### Шаг 7: Mobile Implementation
- То же самое для Mobile app

### Шаг 8: Tests
- Тесты для weekend detection
- Тесты для фильтрации с разными настройками
- Тесты для high-priority всегда видимы
- Тесты для Calendar/Upcoming игнорируют фильтр

## Файлы для создания/изменения

**Desktop:**
- `apps/desktop/src/stores/settingsStore.ts` (новый)
- `apps/desktop/src/utils/weekend.ts` (новый - utility functions)
- `apps/desktop/src/screens/Today.tsx` (обновить)
- `apps/desktop/src/screens/Settings.tsx` (создать или обновить)
- `apps/desktop/test-weekend-filtering.ts` (новый)

**Mobile:**
- `apps/mobile/stores/settingsStore.ts` (новый)
- `apps/mobile/utils/weekend.ts` (новый)
- `apps/mobile/app/dashboard/index.tsx` (обновить)
- `apps/mobile/app/settings/index.tsx` (обновить)

