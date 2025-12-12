# Problem 6: Recurring Tasks With Deadlines - Implementation Plan

## Проблема
Recurring tasks with deadlines + long duration appear inconsistent. Overlapping occurrences, confusion which deadline applies.

## Решение
* Recurring tasks CAN have duration.
* Each occurrence is treated as an independent task with its own deadline.
* Title must include deadline (e.g., "Weekly Report - 12/12/2025").
* Overlap is acceptable and expected if recurrence period < duration.

## Текущее состояние
- ✅ Каждое occurrence уже имеет независимый deadline (Problem 2)
- ✅ Каждое occurrence имеет независимую visibility (Problem 2)
- ❌ Title не включает deadline - нужно добавить
- ✅ Overlap handling уже реализован через Problem 2 (closePreviousOccurrence)

## План реализации

### Шаг 1: Создать функцию для форматирования title с deadline
**Файл:** `apps/desktop/src/utils/recurring.ts`

**Функция:** `formatOccurrenceTitle(templateTitle: string, deadline: Date): string`
- Форматирует deadline в читаемый формат (например, "MM/DD/YYYY")
- Добавляет deadline к title: "Template Title - 12/12/2025"
- Если deadline уже есть в title, не дублирует

### Шаг 2: Обновить ensureActiveOccurrence
**Файл:** `apps/desktop/src/utils/recurring.ts`

- При создании нового occurrence использовать `formatOccurrenceTitle`
- Применить к новому occurrence при создании

### Шаг 3: Обновить generateRecurringInstances (legacy)
**Файл:** `apps/desktop/src/utils/recurring.ts`

- Для обратной совместимости (если где-то еще используется)
- Применить форматирование title при создании instances

### Шаг 4: Реализовать в Mobile
**Файл:** `apps/mobile/utils/recurring.ts`

- Скопировать функцию форматирования
- Обновить создание occurrences

### Шаг 5: Тесты
- Тесты для форматирования title
- Тесты для создания occurrences с deadline в title
- Интеграционные тесты

## Формат deadline в title
Предлагаемый формат: "Template Title - MM/DD/YYYY"
- Короткий и читаемый
- Согласован с американским форматом (MM/DD)
- Можно легко парсить при необходимости

Альтернативные форматы:
- "Template Title - DD.MM.YYYY" (европейский)
- "Template Title (MM/DD/YYYY)"
- "Template Title - Dec 12, 2025"

Рекомендую: "Template Title - MM/DD/YYYY" (простой и понятный)

