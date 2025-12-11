# 🔧 Диагностика проблем с RLS

## Проблема

Политики установлены, но тесты 4 и 5 все еще не проходят. User 2 может удалять и обновлять задачи User 1.

---

## Возможные причины

### 1. Неправильное приведение типов

**Проверьте тип `user_id`:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'user_id';
```

Если `data_type = 'uuid'`, используйте:
```sql
USING (auth.uid() = user_id::uuid)
```

Если `data_type = 'text'` или `'character varying'`, используйте:
```sql
USING (auth.uid()::text = user_id)
```

### 2. RLS включен, но политики не применяются

**Проверьте:**
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'tasks';
```

Должно быть: `rowsecurity = true`

### 3. Политики созданы, но выражения неправильные

**Проверьте выражения политик:**
```sql
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'tasks' AND cmd IN ('DELETE', 'UPDATE');
```

Выражения должны содержать `auth.uid()::text = user_id` (или без `::text` если UUID).

### 4. Проблема с Supabase Auth

**Проверьте, что auth.uid() работает:**
```sql
SELECT auth.uid() as current_user_id;
```

Если возвращает `null`, значит вы не аутентифицированы в Supabase SQL Editor.

---

## Решение

### Шаг 1: Удалите все политики

```sql
DROP POLICY IF EXISTS "Users can view only their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert only their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update only their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete only their own tasks" ON tasks;
```

### Шаг 2: Проверьте тип user_id

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'user_id';
```

### Шаг 3: Создайте политики с ПРАВИЛЬНЫМ приведением типов

**Если user_id = TEXT:**
```sql
CREATE POLICY "Users can delete only their own tasks"
ON tasks FOR DELETE
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update only their own tasks"
ON tasks FOR UPDATE
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);
```

**Если user_id = UUID:**
```sql
CREATE POLICY "Users can delete only their own tasks"
ON tasks FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update only their own tasks"
ON tasks FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### Шаг 4: Проверьте результат

```sql
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'tasks';
```

### Шаг 5: Запустите улучшенные тесты

Я обновил тесты - они теперь проверяют, действительно ли задачи удаляются/обновляются. Запустите:

```powershell
.\RUN_SECURITY_TEST.bat
```

---

## Альтернатива: Используйте service_role key для проверки

Если обычный anon key не работает правильно с RLS, возможно проблема в настройках Supabase. Проверьте, что вы используете правильный ключ в тестах.

