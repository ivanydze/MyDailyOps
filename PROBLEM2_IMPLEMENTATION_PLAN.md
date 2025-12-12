# Problem 2: Recurring Tasks + Duration Overlap - Implementation Plan

## Проблема
Recurring tasks with duration produce overlapping occurrences. User may see two identical recurring tasks simultaneously.

## Решение
Only ONE active occurrence is allowed at a time:
- New occurrence is created only on its start date (visible_from)
- Previous occurrence closes automatically when new one begins
- No pre-generation of future occurrences beyond start date

## План реализации

### Шаг 1: Создать функцию `ensureActiveOccurrence`
**Файл:** `apps/desktop/src/utils/recurring.ts`

**Логика:**
1. Найти все существующие occurrences для template
2. Найти активную occurrence (visible_from <= today <= visible_until, status != 'done')
3. Если активная occurrence заканчивается (visible_until < today) или её нет:
   - Закрыть предыдущую активную occurrence (если есть)
   - Создать следующую occurrence (visible_from = today или ближайший день начала)
4. Если есть активная occurrence и она ещё не закончилась - ничего не делать

**Закрытие предыдущей occurrence:**
- Обновить её `visible_until` на день перед началом новой occurrence
- Это заставит её исчезнуть из видимости

### Шаг 2: Изменить `generateRecurringInstances`
**Текущая логика:** Создает все future occurrences заранее (pre-generation)
**Новая логика:** Создает только ОДНУ occurrence - ту, которая должна быть активна сейчас

Или вообще убрать pre-generation и использовать только `ensureActiveOccurrence`.

### Шаг 3: Вызывать `ensureActiveOccurrence` в нужных местах
1. `fetchTasks` - при загрузке задач проверять все templates
2. `addTask` - после создания template
3. `updateTask` - после обновления template

### Шаг 4: Реализовать в Mobile
Скопировать логику в `apps/mobile/utils/recurring.ts`

### Шаг 5: Тесты
Создать тесты для:
- Предотвращение перекрытия occurrences
- Автоматическое закрытие предыдущей occurrence
- Создание новой occurrence только при необходимости
- Edge cases (same-day recurrence, duration=1, etc.)

## Функции для реализации

### `ensureActiveOccurrence(templateTask: Task, allTasks: Task[]): Promise<Task | null>`
Гарантирует, что для template есть активная occurrence.
Возвращает активную occurrence или null если не нужно создавать.

### `closePreviousOccurrence(previousInstance: Task, newVisibleFrom: string): Promise<void>`
Закрывает предыдущую occurrence, устанавливая visible_until на день перед новой.

### `findActiveOccurrence(templateTask: Task, allTasks: Task[]): Task | null`
Находит текущую активную occurrence для template.

### `getNextOccurrenceDate(templateTask: Task, allTasks: Task[]): Date | null`
Вычисляет дату следующей occurrence (deadline).

