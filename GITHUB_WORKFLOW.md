# Реальный GitHub Workflow - Smart Security Desk

Репозиторий: https://github.com/t1ktakdev/smart-security-desk

## Backlog (Issues)

- #1 Create project skeleton - https://github.com/t1ktakdev/smart-security-desk/issues/1
- #2 Implement cameras API - https://github.com/t1ktakdev/smart-security-desk/issues/2
- #3 Implement events API - https://github.com/t1ktakdev/smart-security-desk/issues/3
- #4 Implement incidents API - https://github.com/t1ktakdev/smart-security-desk/issues/4
- #5 Build operator dashboard - https://github.com/t1ktakdev/smart-security-desk/issues/5
- #6 Add filters and validation - https://github.com/t1ktakdev/smart-security-desk/issues/6
- #7 Test API with Postman - https://github.com/t1ktakdev/smart-security-desk/issues/7
- #8 Prepare v1.0.0 release - https://github.com/t1ktakdev/smart-security-desk/issues/8
- #12 Incident accepts invalid status - https://github.com/t1ktakdev/smart-security-desk/issues/12

## Настоящие merged Pull Requests

- #9 REST API: https://github.com/t1ktakdev/smart-security-desk/pull/9
- #10 Operator Dashboard: https://github.com/t1ktakdev/smart-security-desk/pull/10
- #11 Acceptance tests & Postman: https://github.com/t1ktakdev/smart-security-desk/pull/11
- #13 Incident validation fix: https://github.com/t1ktakdev/smart-security-desk/pull/13

## Ветки и последовательность

- feature/rest-api -> backend endpoints, камер, events, incidents; PR #9.
- feature/operator-dashboard -> adaptive UI; PR #10.
- feature/api-tests -> 19 API tests and Postman Collection; PR #11.
- reproduce/invalid-incident-status -> локальная временная дефектная ветка; НЕ публиковалась.
- fix/incident-validation -> PR #13.

## Доказательства бага

1. В отдельной временной ветке специально убрана проверка статуса.
2. PATCH incident с closed вернул 200 - test-results/bug-before.json.
3. Создана Issue #12 (Severity Medium).
4. PR #13 после исправления объединён в main.
5. Тот же PATCH вернул 400 - test-results/bug-after.json.
6. Тест TC-06 и все 19 node:test прошли.

## Релиз

https://github.com/t1ktakdev/smart-security-desk/releases/tag/v1.0.0

## Ограничения

Создание GitHub Projects Board с Todo/In Progress/Done блокировано: текущий gh auth token не имеет scopes project/read:project. Не считать созданным.

Вместо отдельных feature/cameras-api, feature/events-api и feature/incidents-api использована одна backend-ветка feature/rest-api; сами endpoints и PR реально проверены.

Postman Desktop не установлен, коллекция исполнена через Newman: 9 запросов, 9 assertions, 0 failures. Скриншоты Postman Desktop отсутствуют.
