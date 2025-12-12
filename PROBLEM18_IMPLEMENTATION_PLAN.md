# Problem 18: Desktop Real-time Sync - Implementation Plan

## Текущее состояние

✅ Уже реализовано:
- Supabase Realtime subscription в `App.tsx`
- Базовая обработка изменений задач через postgres_changes

❌ Не реализовано:
- "Sync Now" кнопка в UI
- Auto-polling (30-60 секунд)
- Window focus refresh listener
- Offline/online state handling

## План реализации

### Шаг 1: Sync Now Button
- Добавить кнопку "Sync Now" в Sidebar (рядом с Logout)
- Показывать состояние синхронизации (idle/syncing)
- Использовать `taskStore.sync()` метод
- Добавить визуальную индикацию (spinner при синхронизации)

### Шаг 2: Auto-polling
- Реализовать интервал опроса в `syncService.ts`
- Использовать `setInterval` для опроса каждые 30-60 секунд
- Остановить при размонтировании компонента
- Не опрашивать, если уже идет синхронизация
- Не опрашивать в offline режиме

### Шаг 3: Window Focus Listener
- Добавить listener для события `focus` на window
- При возврате фокуса - вызвать `sync()`
- Очищать listener при размонтировании

### Шаг 4: Offline/Online Handling
- Добавить обработку событий `online` и `offline`
- Показывать индикатор offline статуса
- При возврате online - автоматически синхронизировать
- Останавливать polling в offline режиме

### Шаг 5: Tests
- Тесты для auto-polling
- Тесты для window focus refresh
- Тесты для offline/online handling
- Тесты для Sync Now button

## Файлы для изменения

**Desktop:**
- `apps/desktop/src/components/Sidebar.tsx` - добавить Sync Now button
- `apps/desktop/src/services/syncService.ts` - добавить polling и offline handling
- `apps/desktop/src/App.tsx` - добавить window focus listener
- `apps/desktop/src/stores/taskStore.ts` - убедиться, что sync метод правильно экспортирован
- `apps/desktop/test-realtime-sync.ts` - создать тесты

## Интеграция с существующим кодом

- Realtime subscription уже работает в `App.tsx`
- Нужно добавить fallback механизмы для случаев, когда realtime не сработал
- Polling будет работать параллельно с realtime subscription
- При синхронизации вручную - не запускать polling одновременно

