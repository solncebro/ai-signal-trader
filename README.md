# Signal Trader

Автоматический торговый бот для криптовалют, который обрабатывает торговые сигналы из Telegram чатов и выполняет сделки на Binance.

## Возможности

- **Множественные аккаунты**: Поддержка двух Binance аккаунтов (основной и дополнительный)
- **Множественные чаты**: Каждый аккаунт связан с определенными Telegram чатами
- **Множественные сигналы**: Обработка нескольких торговых сигналов в одном сообщении
- **Анализ сигналов**: Использование OpenAI GPT для анализа и извлечения торговых сигналов
- **Реальное время**: Обновление торговой конфигурации в реальном времени через Firebase
- **Уведомления**: Отправка уведомлений о результатах торговых операций

## Множественные сигналы

Бот поддерживает обработку нескольких торговых сигналов в одном сообщении:

### Примеры сообщений с множественными сигналами:

```
BTC/USDT BUY 45000, ETH/USDT SELL 3000
```

- Сигнал 1: Покупка BTC/USDT по цене 45000
- Сигнал 2: Продажа ETH/USDT по цене 3000

```
BTC/USDT BUY 45000, BTC/USDT SELL 47000
```

- Сигнал 1: Покупка BTC/USDT по цене 45000
- Сигнал 2: Продажа BTC/USDT по цене 47000

```
BTC/USDT BUY MARKET, ETH/USDT SELL 3000, ADA/USDT BUY 0.5
```

- Сигнал 1: Покупка BTC/USDT по рыночной цене
- Сигнал 2: Продажа ETH/USDT по цене 3000
- Сигнал 3: Покупка ADA/USDT по цене 0.5

### Логика обработки:

1. **Анализ сообщения**: OpenAI GPT анализирует сообщение и извлекает все торговые сигналы
2. **Валидация**: Каждый сигнал проверяется на валидность и уровень уверенности (>0.7)
3. **Последовательное выполнение**: Сигналы выполняются один за другим
4. **Логирование**: Каждый сигнал логируется отдельно с указанием номера

## Установка

1. Клонируйте репозиторий:

```bash
git clone <repository-url>
cd signal-trader
```

2. Установите зависимости:

```bash
npm install
```

3. Скопируйте файл конфигурации:

```bash
cp env.example .env
```

4. Настройте переменные окружения в `.env`

## Конфигурация

### Основные настройки

```env
# Идентификатор пользователя
USER_ID=your_user_id

# Telegram API
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_PHONE=your_phone_number
TELEGRAM_APP_SESSION=

# OpenAI для анализа сигналов
OPENAI_API_KEY=your_openai_api_key
```

### Настройка аккаунтов

```env
# Основной аккаунт
EXCHANGE_API_KEY_PRIMARY=your_primary_exchange_api_key
EXCHANGE_SECRET_PRIMARY=your_primary_exchange_secret
PRIMARY_ACCOUNT_CHAT_IDS=chat_id_1,chat_id_2

# Дополнительный аккаунт (опционально)
EXCHANGE_API_KEY_SECONDARY=your_secondary_exchange_api_key
EXCHANGE_SECRET_SECONDARY=your_secondary_exchange_secret
SECONDARY_ACCOUNT_CHAT_IDS=chat_id_3,chat_id_4
```

### Firebase для конфигурации

```env
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY=your_firebase_private_key
```

## Запуск

```bash
npm start
```

## Тестирование

```bash
npm test
```

## Архитектура

### Сервисы

- **TelegramService**: Подключение к Telegram и прослушивание сообщений
- **SignalAnalyzer**: Анализ сообщений и извлечение торговых сигналов
- **ExchangeService**: Выполнение торговых операций на Binance
- **FirebaseService**: Управление торговой конфигурацией
- **NotificationService**: Отправка уведомлений

### Типы сигналов

- **market**: Рыночные ордера
- **limit**: Лимитные ордера с указанной ценой
- **buy/sell**: Покупка/продажа
- **close**: Закрытие позиции

### Множественные сигналы

- **MultipleTradingSignals**: Контейнер для множественных сигналов
- **hasMultipleSignals**: Флаг наличия нескольких сигналов
- **signals[]**: Массив отдельных торговых сигналов

## Безопасность

- Используйте только API ключи с правами на торговлю
- Настройте IP-ограничения в Binance
- Регулярно обновляйте API ключи
- Мониторьте логи на предмет подозрительной активности
