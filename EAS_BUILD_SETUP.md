# EAS Build Setup Guide

## Проблема
Команда `eas` не распознана системой - EAS CLI не установлен.

## Решение

### Вариант 1: Установка через pnpm (рекомендуется)

EAS CLI уже добавлен в `devDependencies`. Установите зависимости:

```bash
cd apps/mobile
pnpm install
```

Затем используйте через pnpm:

```bash
# Production APK Build
pnpm build:android

# Preview APK Build
pnpm build:android:preview

# Development APK Build
pnpm build:android:dev
```

### Вариант 2: Установка EAS CLI глобально

```bash
# Установка глобально через npm
npm install -g eas-cli

# Или через pnpm глобально
pnpm add -g eas-cli
```

После глобальной установки можно использовать `eas` напрямую:

```bash
eas build --platform android --profile production
```

### Вариант 3: Использование через npx/pnpm exec

```bash
# Через npx (если npm установлен)
npx eas-cli build --platform android --profile production

# Через pnpm exec
pnpm exec eas build --platform android --profile production
```

---

## Первый запуск EAS Build

Перед первым build нужно:

1. **Войти в Expo аккаунт**:
```bash
pnpm exec eas login
# Или если установлен глобально:
eas login
```

2. **Настроить проект** (если нужно):
```bash
pnpm exec eas build:configure
```

3. **Запустить build**:
```bash
pnpm build:android
```

---

## Доступные команды

После установки EAS CLI доступны скрипты в `package.json`:

- `pnpm build:android` - Production APK build
- `pnpm build:android:preview` - Preview/internal APK build
- `pnpm build:android:dev` - Development APK build (с dev client)

---

## Проверка установки

Проверьте, что EAS CLI установлен:

```bash
pnpm exec eas --version
```

Должна вывестись версия, например: `13.2.0` или выше.

