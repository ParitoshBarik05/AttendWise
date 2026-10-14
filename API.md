# AttendWise API reference

Base path: `/api`. JSON requests. Protected endpoints require `Authorization: Bearer <token>`.

## Health and authentication
- `GET /health` health check
- `POST /auth/register` `{ name, email, password }`
- `POST /auth/login` `{ email, password }`
- `GET /auth/me`

## Subjects and timetable
- `GET /subjects`, `POST /subjects` `{ name, code?, faculty?, target? }`
- `PUT /subjects/:id`, `DELETE /subjects/:id`
- `GET /timetable`, `POST /timetable` `{ subject, weekday, startTime, endTime, room? }`, `DELETE /timetable/:id`

## Sessions and dashboard
- `GET /sessions?date=YYYY-MM-DD` creates missing dated sessions from active weekly slots and returns the day's sessions
- `POST /sessions/extra` `{ subject, date, startTime, endTime, room?, note? }`
- `PATCH /sessions/:id/status` `{ status: scheduled|present|absent|cancelled }`
- `GET /sessions/history?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /dashboard`

## Push notifications
- `GET /notifications/public-key` returns VAPID public key (requires server configuration)
- `POST /notifications/subscribe` stores browser PushSubscription JSON
- `DELETE /notifications/subscribe` removes the current account's push subscription
- `GET /notifications/history` returns the last 100 delivery attempts

Errors return JSON `{ "message": "..." }`. Server errors do not return stack traces to clients.

CSV timetable import and calendar/history exports are handled in the frontend; timetable rows are persisted through `POST /timetable`.
