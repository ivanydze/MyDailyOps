# Команды для разработки MyDailyOps

## Запуск приложений

### Мобильное приложение (Expo)

Из корня проекта:
```bash
pnpm dev:mobile
```

Или из директории `apps/mobile`:
```bash
cd apps/mobile
pnpm start
```

**Доступные команды для мобильного:**
- `pnpm start` - запуск Expo dev server (tunnel режим)
- `pnpm start:lan` - запуск в LAN режиме
- `pnpm start:localhost` - запуск только на localhost
- `pnpm android` - запуск на Android эмуляторе/устройстве
- `pnpm ios` - запуск на iOS симуляторе/устройстве
- `pnpm web` - запуск в браузере

### Десктопное приложение (Tauri)

Из корня проекта:
```bash
pnpm dev:desktop
```

Или из директории `apps/desktop`:
```bash
cd apps/desktop
pnpm tauri:dev
```

## Запуск обоих приложений одновременно

**Вариант 1: Два терминала (рекомендуется)**

Терминал 1:
```bash
pnpm dev:mobile
```

Терминал 2:
```bash
pnpm dev:desktop
```

**Вариант 2: Использовать параллельный запуск**

Установить `concurrently` глобально:
```bash
npm install -g concurrently
```

Затем запустить оба:
```bash
concurrently "pnpm dev:mobile" "pnpm dev:desktop"
```

## Порты

- **Мобильное приложение (Expo)**: обычно использует порт 8081 (Metro bundler) и 19000-19001 (Expo)
- **Десктопное приложение (Vite)**: порт 1420 (Vite dev server)

## Дополнительные команды

```bash
# Сборка всех приложений
pnpm build

# Запуск линтера
pnpm lint

# Очистка всех build файлов
pnpm clean
```

