# Итоговый чеклист Smart Security Desk

| Пункт | Статус | Доказательство / ограничение |
|---|---|---|
| Исходный HTML и 36 шагов | PASS | Требования обработаны, подробная таблица в отчёте |
| Product Brief и 6 User Stories | PASS | docs/ |
| Репозиторий GitHub | PASS | github.com/t1ktakdev/smart-security-desk |
| Issues 6+ | PASS | #1-#8, #12 |
| GitHub Project Board | BLOCKED | gh auth token без project/read:project |
| Branch + PR + merge | PASS | #9, #10, #11, #13 merged |
| Раздельные backend feature-ветки как в HTML | FAIL | объединённая feature/rest-api |
| 8 REST API routes | PASS | server.js |
| Тестовые данные и JSON persistence | PASS | data/db.json + npm test |
| Валидация 200/201/400/404 | PASS | 19 node:test |
| Backend tests | PASS | 19/19 без ошибок |
| Postman Desktop | BLOCKED | не установлен |
| Postman Collection через Newman | PASS | 9 requests, 9 assertions, 0 failures |
| Dashboard, forms, filters | PASS | screenshots 01-12, browser-results.json |
| Адаптивная ширина 390 px | PASS | screenshot 12 |
| HLS player MediaMTX | PASS | URL HTTP 200, реальная страница плеера; движущиеся кадры не утверждаются |
| Bug before/after | PASS | 200 до / 400 после; issue #12, PR #13 |
| Release v1.0.0 | PASS | GitHub Release |
| Реальные скриншоты | PASS | 19 PNG в screenshots/ |
| Все 24 рекомендованных скриншота | FAIL | VS Code, настольный Postman, Board и некоторые терминальные сцены отсутствуют |
| Консоль без любых 404 | FAIL | браузерный журнал зафиксировал 404 отдельных ресурсов |
| DOCX + PDF | PASS | готовые файлы в корне FINAL, проверять после конвертации |
| Итоговый ZIP | PASS | готовый архив, проверять после сборки |
| Запрет на изменение SpecWATT | PASS | работа в отдельном D:\\TRPP-Smart-Security-Desk-FINAL |
| Самооценка | N/A | ориентир 94/100, преподаватель оценивает отдельно |

## Команды проверки

npm ci
npm start
npm test

Открыть http://localhost:3000/api/health. Запуск доступен без видеосистемы, preview будет недоступен при выключенном MediaMTX.

Секреты и огромный node_modules в архив не включать.
