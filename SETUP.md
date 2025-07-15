# Инструкция по настройке Signal Trader

## Шаг 1: Подготовка окружения

### Установка зависимостей
```bash
npm install
```

### Создание файла конфигурации
```bash
cp env.example .env
```

## Шаг 2: Настройка пользователя

1. Укажите уникальный `USER_ID` в файле `.env`
   - Этот ID используется для идентификации пользователя в Firebase
   - Рекомендуется использовать email или уникальный идентификатор

## Шаг 3: Настройка Telegram API

1. Перейдите на https://my.telegram.org
2. Войдите в свой аккаунт
3. Перейдите в "API development tools"
4. Создайте новое приложение:
   - App title: Signal Trader
   - Short name: signaltrader
   - Platform: Desktop
   - Description: Trading bot for cryptocurrency signals

5. Скопируйте `api_id` и `api_hash` в файл `.env`

### Получение ID чатов
1. Добавьте @userinfobot в нужные чаты
2. Отправьте любое сообщение в каждый чат
3. Бот покажет ID чата
4. Добавьте ID в соответствующие переменные:
   - `PRIMARY_ACCOUNT_CHAT_IDS` - для основного аккаунта
   - `SECONDARY_ACCOUNT_CHAT_IDS` - для дополнительного аккаунта

## Шаг 4: Настройка OpenAI API

1. Перейдите на https://platform.openai.com
2. Создайте аккаунт или войдите
3. Перейдите в "API Keys"
4. Создайте новый API ключ
5. Добавьте ключ в переменную `OPENAI_API_KEY`

## Шаг 5: Настройка Firebase

### Создание проекта Firebase

1. Перейдите на https://console.firebase.google.com
2. Создайте новый проект или выберите существующий
3. Включите Firestore Database:
   - Перейдите в "Firestore Database"
   - Нажмите "Create database"
   - Выберите "Start in test mode" для разработки
   - Выберите ближайший регион

### Получение конфигурации

1. В настройках проекта перейдите в "Project settings"
2. В разделе "Your apps" нажмите "Add app"
3. Выберите веб-платформу (</>)
4. Зарегистрируйте приложение с любым именем
5. Скопируйте конфигурацию и добавьте в `.env`:

```env
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

### Настройка правил безопасности

В Firestore Database > Rules добавьте:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/exchange/{exchange}/tradeType/{tradeType}/modules/{module} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Шаг 6: Настройка биржи

### Пример для Binance

1. Создайте аккаунт на Binance
2. Перейдите в "API Management"
3. Создайте новый API ключ
4. Включите разрешения:
   - Futures Trading (обязательно для фьючерсной торговли)
   - Spot & Margin Trading (опционально)
5. Добавьте IP адрес вашего сервера в whitelist

### Настройка нескольких аккаунтов

Бот поддерживает работу с двумя аккаунтами Binance:

#### Primary Account (обязательный)
```env
EXCHANGE_API_KEY_PRIMARY=your_primary_api_key_here
EXCHANGE_SECRET_PRIMARY=your_primary_secret_here
EXCHANGE_SANDBOX_PRIMARY=true
PRIMARY_ACCOUNT_CHAT_IDS=chat_id_1,chat_id_2
```

#### Secondary Account (опциональный)
```env
EXCHANGE_API_KEY_SECONDARY=your_secondary_api_key_here
EXCHANGE_SECRET_SECONDARY=your_secondary_secret_here
EXCHANGE_SANDBOX_SECONDARY=true
SECONDARY_ACCOUNT_CHAT_IDS=chat_id_3,chat_id_4
```

### Особенности конфигурации

- Каждый аккаунт может быть привязан к определенным Telegram чатам
- Сигналы из чатов автоматически направляются на соответствующий аккаунт
- Поддерживается hedge mode для фьючерсной торговли
- Автоматическое управление кредитным плечом (5x для BTC, 3x для остальных)

## Шаг 7: Тестирование

### Проверка конфигурации
```bash
npm run build
```

### Запуск в режиме разработки
```bash
npm run dev
```

При первом запуске потребуется ввести код подтверждения из Telegram.

### Проверка логов
```bash
tail -f logs/combined.log
```

## Шаг 8: Запуск в продакшене

1. Убедитесь, что все настройки корректны
2. В Firebase включите торговлю через веб-интерфейс или API
3. Установите `EXCHANGE_SANDBOX_PRIMARY=false` и `EXCHANGE_SANDBOX_SECONDARY=false`
4. Запустите приложение:

```bash
npm run build
npm start
```

## Управление настройками

### Real-time обновления

Бот автоматически отслеживает изменения настроек в Firebase:
- Изменения вступают в силу мгновенно без перезапуска
- Все изменения логируются в консоль
- Поддерживаются изменения: `isEnabled`, `maxPositionSize`, `riskPercentage`

### Через Firebase Console

1. Перейдите в Firebase Console > Firestore Database
2. Найдите документ по пути: `users/{userId}/exchange/binance/tradeType/futures/modules/signalTrader`
3. Измените нужные поля:
   - `isEnabled` - включить/выключить торговлю
   - `maxPositionSize` - максимальный размер позиции в USDT
   - `riskPercentage` - процент риска на сделку

### Через API (программно)

```typescript
// Включить торговлю
await exchangeService.updateTradingConfig({ isEnabled: true });

// Изменить размер позиции
await exchangeService.updateTradingConfig({ maxPositionSize: 200 });

// Изменить процент риска
await exchangeService.updateTradingConfig({ riskPercentage: 5 });
```

### Мониторинг изменений

В логах приложения вы увидите записи о real-time обновлениях:
```
Trading config updated in real-time: { isEnabled: true, maxPositionSize: 150, riskPercentage: 3 }
```

## Мониторинг и обслуживание

### Просмотр логов
```bash
# Все логи
tail -f logs/combined.log

# Только ошибки
tail -f logs/error.log
```

### Проверка статуса
```bash
# Проверка процессов
ps aux | grep signal-trader

# Проверка портов (если используется)
netstat -tulpn | grep node
```

### Обновление
```bash
git pull
npm install
npm run build
npm start
```

## Безопасность

### Рекомендации
1. Используйте отдельные аккаунты для разных стратегий
2. Ограничьте API ключи только необходимыми разрешениями
3. Регулярно ротируйте API ключи
4. Мониторьте логи на предмет подозрительной активности
5. Начните с малых сумм для тестирования
6. Используйте sandbox режим для первоначального тестирования
7. Настройте правила безопасности в Firebase
8. Используйте аутентификацию Firebase для доступа к данным

### Резервное копирование
```bash
# Создание резервной копии конфигурации
cp .env .env.backup

# Создание резервной копии логов
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/
```

## Устранение неполадок

### Проблемы с Telegram
- Убедитесь, что номер телефона указан в международном формате
- Проверьте правильность API ID и Hash
- Убедитесь, что у вас есть доступ к целевым чатам
- Проверьте, что чаты правильно привязаны к аккаунтам

### Проблемы с биржей
- Проверьте правильность API ключей для каждого аккаунта
- Убедитесь, что IP адрес добавлен в whitelist
- Проверьте баланс на аккаунтах
- Убедитесь, что включены разрешения для фьючерсной торговли

### Проблемы с Firebase
- Проверьте правильность конфигурации Firebase
- Убедитесь, что Firestore Database включен
- Проверьте правила безопасности в Firestore
- Убедитесь, что USER_ID указан корректно
- Проверьте, что real-time обновления работают (смотрите логи)

### Проблемы с OpenAI
- Проверьте правильность API ключа
- Убедитесь, что у вас есть кредиты на аккаунте
- Проверьте лимиты API

## Поддержка

При возникновении проблем:
1. Проверьте логи в папке `logs/`
2. Убедитесь, что все переменные окружения настроены корректно
3. Проверьте документацию используемых API
4. Создайте issue в репозитории проекта 