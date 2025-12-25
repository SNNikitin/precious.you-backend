# Техническое задание: Backend для precious.you

**Репозиторий:** https://github.com/SNNikitin/precious.you-backend

## 1. Общее описание проекта

**Название:** precious.you  
**Слоган:** “yes, you are”  
**Домен:** precious.you

### 1.1 Концепция

Мобильное приложение для отправки позитивных пуш-уведомлений с тёплыми, поддерживающими сообщениями. Цель — дарить пользователям безусловное принятие и эмоциональную поддержку.

### 1.2 Целевая аудитория

- **MVP:** женская аудитория 18-35 лет
- **Расширение:** дети, питомцы (напоминания для владельцев), другие демографии

-----

## 2. Функциональные требования

### 2.1 Управление пользователями

```
POST   /api/v1/auth/apple        # Вход через Apple
POST   /api/v1/auth/google       # Вход через Google
POST   /api/v1/auth/logout       # Выход
POST   /api/v1/auth/refresh      # Обновление токена
DELETE /api/v1/auth/account      # Удаление аккаунта
GET    /api/v1/auth/me           # Текущий пользователь
```

**OAuth Flow:**

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│  Apple/  │────▶│  Backend │
│   App    │     │  Google  │     │   API    │
└──────────┘     └──────────┘     └──────────┘
     │                                  │
     │  1. Нажатие "Sign in with..."    │
     │──────────────────────────────────▶
     │                                  │
     │  2. OAuth redirect               │
     │◀──────────────────────────────────
     │                                  │
     │  3. Пользователь авторизуется    │
     │         в Apple/Google           │
     │                                  │
     │  4. identity_token + user_info   │
     │──────────────────────────────────▶
     │                                  │
     │  5. Верификация токена           │
     │     Создание/обновление user     │
     │     Генерация JWT                │
     │                                  │
     │  6. { access_token, refresh_token, user }
     │◀──────────────────────────────────
```

**Request: Sign in with Apple**

```typescript
// POST /api/v1/auth/apple
interface AppleAuthRequest {
  identity_token: string;      // JWT от Apple
  authorization_code: string;  // для получения refresh_token
  user?: {                     // только при первом входе
    email: string;
    name?: {
      firstName: string;
      lastName: string;
    };
  };
}
```

**Request: Sign in with Google**

```typescript
// POST /api/v1/auth/google
interface GoogleAuthRequest {
  id_token: string;            // JWT от Google
  access_token?: string;       // опционально
}
```

**Response: успешная авторизация**

```typescript
interface AuthResponse {
  access_token: string;        // JWT, 15 минут
  refresh_token: string;       // JWT, 30 дней
  user: {
    id: string;
    email: string;
    display_name: string;
    is_new_user: boolean;      // true если только что зарегистрировался
  };
}
```

**Модель User:**

```typescript
interface User {
  id: string;                    // UUID
  email: string;                 // из Apple/Google, уникальный
  display_name: string;          // как обращаться в сообщениях
  gender: 'female' | 'male' | 'neutral' | null;
  language: string;              // ru, en, etc.
  timezone: string;              // для правильного времени отправки
  
  // OAuth провайдеры
  apple_id: string | null;       // Apple user ID (sub)
  google_id: string | null;      // Google user ID (sub)
  
  avatar_url: string | null;     // из Google (Apple не даёт)
  created_at: timestamp;
  updated_at: timestamp;
}
```

**Особенности Apple Sign In:**

- Apple отдаёт email и имя только при ПЕРВОМ входе — нужно сохранять сразу
- Apple может скрыть email (Private Email Relay) — работать с этим
- Требуется верификация identity_token через Apple публичные ключи
- Для App Store Review: поддержка обязательна если есть другие OAuth

**Особенности Google Sign In:**

- Всегда отдаёт email и имя
- Даёт avatar_url
- Верификация id_token через Google публичные ключи

### 2.2 Настройки уведомлений

```
GET    /api/v1/settings              # Получить настройки
PUT    /api/v1/settings              # Обновить настройки
POST   /api/v1/settings/test-push    # Отправить тестовое уведомление
```

**Модель NotificationSettings:**

```typescript
interface NotificationSettings {
  user_id: string;
  enabled: boolean;                    // глобальный переключатель
  frequency: 'rare' | 'normal' | 'often';  // 1-2, 3-5, 6-10 в день
  quiet_hours_start: string;           // "23:00"
  quiet_hours_end: string;             // "08:00"
  categories: string[];                // выбранные категории сообщений
  push_token: string;                  // FCM/APNs токен
  device_type: 'ios' | 'android';
}
```

### 2.3 Библиотека сообщений

```
GET    /api/v1/messages              # Список сообщений (с фильтрами)
GET    /api/v1/messages/:id          # Конкретное сообщение
GET    /api/v1/messages/categories   # Список категорий
POST   /api/v1/messages/favorite     # Добавить в избранное
DELETE /api/v1/messages/favorite/:id # Убрать из избранного
GET    /api/v1/messages/favorites    # Список избранного
```

**Модель Message:**

```typescript
interface Message {
  id: string;
  text_template: string;           // "{{name}}, ты умничка!"
  category: string;                // "affirmation", "motivation", "comfort"
  gender_variant: 'female' | 'male' | 'neutral';
  language: string;
  is_active: boolean;
  created_at: timestamp;
}
```

**Категории сообщений (MVP):**

- `affirmation` — “ты хорошая”, “ты достаточно”
- `motivation` — “ты справишься”, “у тебя получится”
- `comfort` — “всё будет хорошо”, “ты в безопасности”
- `appreciation` — “ты молодец”, “ты умничка”
- `self_worth` — “ты ценная”, “ты важная”

### 2.4 История и статистика

```
GET    /api/v1/history               # История полученных сообщений
GET    /api/v1/stats                 # Статистика пользователя
```

**Модель NotificationHistory:**

```typescript
interface NotificationHistory {
  id: string;
  user_id: string;
  message_id: string;
  sent_at: timestamp;
  opened: boolean;
  opened_at: timestamp | null;
}
```

### 2.5 Подписки (для будущего монетизации)

```
GET    /api/v1/subscription          # Текущая подписка
POST   /api/v1/subscription/verify   # Верификация покупки (App Store/Google Play)
```

**Модель Subscription:**

```typescript
interface Subscription {
  user_id: string;
  plan: 'free' | 'premium';
  platform: 'ios' | 'android' | 'web';
  store_transaction_id: string | null;
  expires_at: timestamp | null;
}
```

-----

## 3. Системные требования

### 3.1 Технологический стек

|Компонент|Технология              |Обоснование               |
|---------|------------------------|--------------------------|
|Runtime  |Node.js 20+ / Bun       |Асинхронность, экосистема |
|Framework|Hono / Fastify          |Лёгкий, быстрый           |
|Database |PostgreSQL 16           |Надёжность, JSON поддержка|
|ORM      |Drizzle ORM             |Type-safe, лёгкий         |
|Cache    |Redis                   |Сессии, rate limiting     |
|Queue    |BullMQ                  |Очередь уведомлений       |
|Push     |Firebase Cloud Messaging|Кросс-платформа           |

### 3.2 Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                      API Server                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │   Auth   │  │ Settings │  │ Messages │  │  Stats   │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼───────┐ ┌───────▼───────┐ ┌───────▼───────┐
│  PostgreSQL   │ │     Redis     │ │    BullMQ     │
│   (данные)    │ │ (кэш/сессии)  │ │   (очередь)   │
└───────────────┘ └───────────────┘ └───────┬───────┘
                                            │
                                    ┌───────▼───────┐
                                    │ Push Worker   │
                                    │  (FCM/APNs)   │
                                    └───────────────┘
```

### 3.3 Сервис отправки уведомлений (Push Worker)

**Логика работы:**

1. Каждую минуту проверять пользователей, которым пора отправить сообщение
1. Учитывать timezone и quiet_hours каждого пользователя
1. Случайно выбирать сообщение из активных категорий
1. Персонализировать (подставить имя, склонение)
1. Отправить через FCM
1. Записать в историю

**Алгоритм частоты:**

```typescript
const FREQUENCY_CONFIG = {
  rare: { min: 1, max: 2, minIntervalHours: 8 },
  normal: { min: 3, max: 5, minIntervalHours: 3 },
  often: { min: 6, max: 10, minIntervalHours: 1 }
};
```

-----

## 4. База данных (PostgreSQL Schema)

```sql
-- Пользователи
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  gender VARCHAR(20) DEFAULT 'female',
  language VARCHAR(10) DEFAULT 'ru',
  timezone VARCHAR(50) DEFAULT 'Europe/Moscow',
  
  -- OAuth провайдеры
  apple_id VARCHAR(255) UNIQUE,
  google_id VARCHAR(255) UNIQUE,
  avatar_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для быстрого поиска по OAuth ID
CREATE INDEX idx_users_apple_id ON users(apple_id) WHERE apple_id IS NOT NULL;
CREATE INDEX idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;

-- Настройки уведомлений
CREATE TABLE notification_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  frequency VARCHAR(20) DEFAULT 'normal',
  quiet_hours_start TIME DEFAULT '23:00',
  quiet_hours_end TIME DEFAULT '08:00',
  categories TEXT[] DEFAULT ARRAY['affirmation', 'motivation', 'comfort', 'appreciation', 'self_worth'],
  push_token TEXT,
  device_type VARCHAR(20),
  last_notification_at TIMESTAMPTZ,
  notifications_today INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Библиотека сообщений
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_template TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  gender_variant VARCHAR(20) DEFAULT 'female',
  language VARCHAR(10) DEFAULT 'ru',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Избранные сообщения
CREATE TABLE favorite_messages (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, message_id)
);

-- История уведомлений
CREATE TABLE notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id),
  message_text TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened BOOLEAN DEFAULT false,
  opened_at TIMESTAMPTZ
);

-- Подписки
CREATE TABLE subscriptions (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(20) DEFAULT 'free',
  platform VARCHAR(20),
  store_transaction_id TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_notification_settings_enabled ON notification_settings(enabled) WHERE enabled = true;
CREATE INDEX idx_notification_history_user_sent ON notification_history(user_id, sent_at DESC);
CREATE INDEX idx_messages_category_active ON messages(category, is_active) WHERE is_active = true;
```

-----

## 5. Seed данные (начальные сообщения)

```typescript
const SEED_MESSAGES = [
  // Affirmation
  { text: "{{name}}, ты хорошая 💛", category: "affirmation" },
  { text: "Ты достаточно. Просто такая, какая есть", category: "affirmation" },
  { text: "{{name}}, ты заслуживаешь любви", category: "affirmation" },
  { text: "Ты ценная. Не забывай об этом", category: "affirmation" },
  
  // Motivation  
  { text: "{{name}}, ты справишься! 💪", category: "motivation" },
  { text: "У тебя всё получится", category: "motivation" },
  { text: "Ты сильнее, чем думаешь", category: "motivation" },
  { text: "Каждый маленький шаг — это прогресс", category: "motivation" },
  
  // Comfort
  { text: "Всё будет хорошо 🌸", category: "comfort" },
  { text: "{{name}}, ты в безопасности", category: "comfort" },
  { text: "Можно просто быть. Не нужно ничего доказывать", category: "comfort" },
  { text: "Сегодня можно отдохнуть", category: "comfort" },
  
  // Appreciation
  { text: "{{name}}, ты умничка! ✨", category: "appreciation" },
  { text: "Ты молодец, что стараешься", category: "appreciation" },
  { text: "Горжусь тобой", category: "appreciation" },
  
  // Self-worth
  { text: "Ты важная", category: "self_worth" },
  { text: "{{name}}, мир лучше, потому что ты в нём есть", category: "self_worth" },
  { text: "Ты уникальная и неповторимая", category: "self_worth" },
];
```

-----

## 6. Безопасность

### 6.1 Аутентификация

- **OAuth 2.0:** Sign in with Apple + Sign in with Google
- JWT токены (access 15 мин, refresh 30 дней)
- Rate limiting: 100 req/min на IP, 1000 req/min на user

### 6.2 Верификация OAuth токенов

**Apple Identity Token:**

```typescript
// Верификация через JWKS
// https://appleid.apple.com/auth/keys
async function verifyAppleToken(identityToken: string): Promise<ApplePayload> {
  const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
  // 1. Получить публичные ключи Apple
  // 2. Декодировать header токена, взять kid
  // 3. Найти соответствующий ключ
  // 4. Верифицировать подпись
  // 5. Проверить: iss = "https://appleid.apple.com"
  // 6. Проверить: aud = наш app bundle ID
  // 7. Проверить: exp > now
  return payload; // { sub, email, email_verified }
}
```

**Google ID Token:**

```typescript
// Верификация через Google OAuth2 Client
// npm: google-auth-library
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

async function verifyGoogleToken(idToken: string): Promise<GooglePayload> {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload(); // { sub, email, name, picture }
}
```

### 6.3 Валидация

- Zod схемы для всех входящих данных
- Sanitization email и строковых полей
- Максимальная длина display_name: 100 символов

### 6.4 GDPR/Приватность

- Endpoint для полного удаления аккаунта (+ revoke Apple/Google tokens)
- Endpoint для экспорта данных пользователя
- Минимальный сбор данных
- Поддержка Apple Private Email Relay

-----

## 7. Деплой

### 7.1 Настройка OAuth провайдеров

**Apple Sign In (Apple Developer Console):**

1. Зайти в [developer.apple.com](https://developer.apple.com)
1. Certificates, Identifiers & Profiles → Identifiers
1. Создать App ID с включённым “Sign in with Apple”
1. Создать Services ID для web (если нужен web-клиент)
1. Создать Key для Sign in with Apple → скачать .p8 файл
1. Записать: Team ID, Key ID, Bundle ID, Private Key

**Google Sign In (Google Cloud Console):**

1. Зайти в [console.cloud.google.com](https://console.cloud.google.com)
1. Создать проект или выбрать существующий
1. APIs & Services → Credentials
1. Create Credentials → OAuth 2.0 Client IDs
1. Создать для iOS (Bundle ID) и Android (SHA-1)
1. Записать: Client ID для каждой платформы

### 7.2 Окружения

- `development` — локальная разработка
- `staging` — тестирование
- `production` — боевой сервер

### 7.3 Переменные окружения

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/precious

# Redis
REDIS_URL=redis://host:6379

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Apple Sign In
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_CLIENT_ID=you.precious.app          # Bundle ID
APPLE_KEY_ID=XXXXXXXXXX
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...

# Google Sign In
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret    # для web, не нужен для mobile

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=precious-you
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# App
NODE_ENV=production
PORT=3000
API_URL=https://api.precious.you
```

### 7.4 Рекомендуемый хостинг

- **API:** Railway / Render / Fly.io
- **Database:** Supabase / Neon (managed PostgreSQL)
- **Redis:** Upstash (serverless Redis)

-----

## 8. MVP Scope

### Фаза 1 (MVP)

- [x] Регистрация/авторизация
- [x] Базовые настройки уведомлений
- [x] Push Worker с расписанием
- [x] 20+ сообщений на русском (женский род)
- [x] История уведомлений

### Фаза 2

- [ ] Избранные сообщения
- [ ] Множественные языки
- [ ] Мужской/нейтральный род
- [ ] Статистика и аналитика

### Фаза 3

- [ ] Premium подписка
- [ ] Кастомные сообщения
- [ ] Виджеты
- [ ] API для партнёров

-----

## 9. Запуск проекта

```bash
# Клонировать репозиторий
git clone git@github.com:SNNikitin/precious.you-backend.git
cd precious.you-backend

# Установить зависимости
bun install

# Настроить окружение
cp .env.example .env
# отредактировать .env

# Запустить БД (Docker)
docker-compose up -d postgres redis

# Миграции
bun run db:migrate
bun run db:seed

# Запуск
bun run dev        # development
bun run start      # production
bun run worker     # push worker отдельно
```

-----

## 10. Контакты и ресурсы

**Проект:** precious.you  
**Домен:** precious.you  
**Брендбук:** precious-brand-guidelines.html  
**Цвета:** Primary #5D4E4E, Accent #FFE5A0

-----

*Документ создан для использования с Claude Code*  
*Версия: 1.0*  
*Дата: Декабрь 2025*
