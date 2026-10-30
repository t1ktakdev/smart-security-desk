# User Stories и Acceptance Criteria

| ID | User Story | Acceptance Criteria |
|---|---|---|
| US-01 | Оператор просматривает камеры | id, name, location, status, previewUrl |
| US-02 | Оператор видит события IoT | type, cameraId, severity, time |
| US-03 | Оператор создаёт инцидент | автоматически status=new |
| US-04 | Оператор меняет статус | new -> in_progress -> resolved |
| US-05 | Инженер меняет статус камеры | только online/offline и updatedAt |
| US-06 | Пользователь фильтрует инциденты | status/severity в API и UI |

Проверки: TC-01..TC-08, дополнительные API-тесты, браузерный интерфейс.
