# 🚀 EAS Build - Quick Start Guide

## Проблема решена ✅

Исправлена конфигурация для использования EAS CLI через `npx`.

---

## 📋 Быстрый старт

### 1. Установите зависимости (если еще не установлены)

```bash
cd apps/mobile
pnpm install
```

### 2. Войдите в Expo аккаунт

```bash
pnpm eas:login
```

Или напрямую:
```bash
npx eas-cli login
```

### 3. Запустите сборку APK

```bash
# Production APK
pnpm build:android

# Preview APK (для тестирования)
pnpm build:android:preview

# Development APK (с dev client)
pnpm build:android:dev
```

---

## 🔧 Альтернативные способы

### Вариант 1: Через npx (рекомендуется)

Все команды теперь используют `npx eas-cli`, что не требует глобальной установки:

```bash
npx eas-cli login
npx eas-cli build --platform android --profile production
```

### Вариант 2: Глобальная установка

Если хотите использовать `eas` напрямую:

```bash
# Установка глобально
npm install -g eas-cli
# или
pnpm add -g eas-cli

# Затем используйте напрямую
eas login
eas build --platform android --profile production
```

### Вариант 3: Через скрипты в package.json

Используйте готовые скрипты:

```bash
pnpm eas:login          # Войти в Expo
pnpm eas:configure      # Настроить проект (опционально)
pnpm build:android      # Production build
```

---

## 📝 Доступные команды

### Скрипты в package.json:

- `pnpm eas:login` - Войти в Expo аккаунт
- `pnpm eas:configure` - Настроить EAS Build
- `pnpm build:android` - Production APK build
- `pnpm build:android:preview` - Preview APK build
- `pnpm build:android:dev` - Development APK build

### Прямые команды через npx:

- `npx eas-cli login`
- `npx eas-cli build:configure`
- `npx eas-cli build --platform android --profile production`

---

## ✅ Проверка установки

Проверьте, что EAS CLI доступен:

```bash
npx eas-cli --version
```

Должна вывестись версия, например: `13.2.0` или выше.

---

## 🎯 Первый запуск

1. **Войдите в Expo**:
   ```bash
   pnpm eas:login
   ```

2. **Настройте проект** (если нужно):
   ```bash
   pnpm eas:configure
   ```

3. **Запустите build**:
   ```bash
   pnpm build:android
   ```

---

## 💡 Примечания

- `npx` автоматически скачает и запустит `eas-cli` если он не установлен
- Не требуется глобальная установка
- Все команды работают через `npx eas-cli`
- Скрипты в `package.json` уже настроены правильно

