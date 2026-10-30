# Smart Security Desk / ТРПП

Учебное MVP для службы безопасности и IT-отдела: камеры CCTV, события IoT, инциденты, фильтры, изменение статусов и локальный preview MediaMTX. Исходные записи JSON являются демонстрационными. Система не предназначена для боевой охраны без аутентификации и защищённого хранилища.

## Запуск

1. Node.js LTS: node -v, npm -v
2. Установить зависимости: npm ci
3. Запуск: npm start
4. Открыть http://localhost:3000 и http://localhost:3000/api/health
5. Если 3000 занят: в PowerShell установить $env:PORT=3100; npm start

Сервер привязан только к 127.0.0.1, не доступен извне.

## Тестирование

- Запустить npm test. Тесты работают на временной копии db.json.
- Импортировать postman/Smart-Security-Desk.postman_collection.json в Postman.
- При установленном Newman запуск: npx newman run postman/Smart-Security-Desk.postman_collection.json --env-var "baseUrl=http://localhost:3000"
- Значения статуса инцидента: new -> in_progress -> resolved. Значение closed запрещено.
- Возвращаются HTTP 200/201/400/404; входные поля проверяются строго.

## API

GET /api/health, GET /api/cameras, PATCH /api/cameras/:id, GET /api/events, POST /api/events,
GET /api/incidents, POST /api/incidents, PATCH /api/incidents/:id.

POST events: type (motion, door_open, smoke, camera_offline), cameraId, severity, message.
POST incidents: title, cameraId, severity, необязательное description.
PATCH incidents: status, assignee. PATCH cameras: только status.

## MediaMTX

Для CAM-01 указан http://localhost:8888/cam1. Реальный поток может открываться во встроенном preview или отдельной вкладке только при работающем MediaMTX. Приложение ничего не меняет в предыдущей лабораторной. HTTP 200 страницы сам по себе не доказывает наличие кадров.

## Файлы

- server.js: Express API, строгая валидация, атомарное JSON-сохранение.
- data/db.json: безопасная учебная база.
- public: адаптивный интерфейс и Fetch API с безопасным DOM.
- tests/api.test.js: повторяемые тесты.
- postman: коллекция Postman.
- docs: Product Brief, истории и теория.

Ограничения: без production authentication, NVR, реальных MQTT-подписок и промышленной БД. Студент: Абиталипов Санжар Русланбекович, КС-2-24, ПК МУКР, Бишкек, 2026.
