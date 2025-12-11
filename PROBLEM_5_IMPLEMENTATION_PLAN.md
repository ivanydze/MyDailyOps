# Problem 5: Deadline-Anchored Duration - Implementation Plan

## Цель
Исправить логику видимости задач: duration должен рассчитываться ОТ deadline назад, чтобы задача не исчезла раньше deadline.

**Формула:**
```
visible_from = deadline - (duration_days - 1)
visible_until = deadline
```

## Шаги реализации

### ✅ Шаг 1: Создать утилиту для расчета видимости
- [x] `apps/desktop/src/utils/visibility.ts` - создан
- [x] `apps/mobile/utils/visibility.ts` - создан

### 🔄 Шаг 2: Добавить поля в схему базы данных

#### Desktop (SQLite):
- [ ] Добавить `duration_days INTEGER`
- [ ] Добавить `visible_from TEXT` (ISO date)
- [ ] Добавить `visible_until TEXT` (ISO date)
- [ ] Обновить миграцию в `apps/desktop/src/lib/db.ts`

#### Mobile (SQLite):
- [ ] Добавить `duration_days INTEGER`
- [ ] Добавить `visible_from TEXT`
- [ ] Добавить `visible_until TEXT`
- [ ] Обновить миграцию в `apps/mobile/database/init.ts`

#### Supabase (PostgreSQL):
- [ ] Создать миграцию SQL для добавления полей
- [ ] Поля должны быть nullable (для обратной совместимости)

### 🔄 Шаг 3: Обновить маппинг Task

#### Desktop:
- [ ] Обновить `apps/desktop/src/stores/taskStore.ts` - добавить поля в маппинг
- [ ] Обновить `apps/desktop/src/lib/db.ts` - добавить поля в SELECT/INSERT/UPDATE

#### Mobile:
- [ ] Обновить `apps/mobile/database/init.ts` - добавить поля в маппинг
- [ ] Обновить `apps/mobile/hooks/useDashboard.ts` (если нужно)

### 🔄 Шаг 4: Автоматический расчет видимости

#### При создании задачи:
- [ ] Desktop: `apps/desktop/src/stores/taskStore.ts` - `addTask()`
- [ ] Mobile: `apps/mobile/hooks/useDashboard.ts` или соответствующий хук

#### При обновлении задачи (особенно deadline):
- [ ] Desktop: `apps/desktop/src/stores/taskStore.ts` - `updateTask()`
- [ ] Mobile: соответствующий хук для обновления

#### При создании recurring instances:
- [ ] `apps/desktop/src/utils/recurring.ts` - `generateRecurringInstances()`
- [ ] `apps/mobile/utils/recurring.ts` - `generateRecurringInstances()`

### 🔄 Шаг 5: Обновить фильтрацию задач

#### Desktop Today view:
- [ ] `apps/desktop/src/screens/Today.tsx` - использовать `isVisibleToday()`

#### Mobile Today/All Tasks:
- [ ] `apps/mobile/utils/groupTasksByDate.ts` - использовать `isTaskVisible()`
- [ ] `apps/mobile/hooks/useDashboard.ts` - обновить фильтрацию

### 🔄 Шаг 6: Добавить UI для duration_days

#### Desktop:
- [ ] `apps/desktop/src/screens/NewTask.tsx` - поле для duration_days
- [ ] `apps/desktop/src/screens/EditTask.tsx` - поле для duration_days

#### Mobile:
- [ ] `apps/mobile/app/tasks/add.tsx` - поле для duration_days
- [ ] `apps/mobile/app/tasks/edit.tsx` - поле для duration_days

### 🔄 Шаг 7: Обновить sync service

- [ ] `apps/desktop/src/services/syncService.ts` - включить новые поля в sync
- [ ] `apps/mobile/lib/sync.ts` - включить новые поля в sync

### 🔄 Шаг 8: Тестирование

- [ ] Создать задачу с deadline и duration_days
- [ ] Проверить, что visible_from и visible_until рассчитываются правильно
- [ ] Проверить, что задача видна в диапазоне visible_from → visible_until
- [ ] Проверить, что задача НЕ видна до visible_from и после visible_until
- [ ] Проверить обновление deadline - видимость пересчитывается
- [ ] Проверить recurring tasks - каждая instance имеет правильную видимость

## Примечания

1. **Обратная совместимость**: Все новые поля должны быть nullable, чтобы существующие задачи продолжали работать (fallback на старую логику по deadline).

2. **Fallback логика**: Если visible_from/visible_until отсутствуют, использовать старую логику (видимость только по deadline).

3. **Default duration**: Если duration_days не указан, по умолчанию = 1 день.

4. **Задачи без deadline**: Если deadline отсутствует, visible_from/visible_until = null (задача всегда видна).

## Формула (повтор)

```typescript
if (deadline && durationDays) {
  visible_from = deadline - (durationDays - 1) days
  visible_until = deadline
} else {
  visible_from = null
  visible_until = null  // Task always visible (legacy behavior)
}
```

