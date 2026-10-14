# AttendWise Architecture

## Runtime components
- React + Vite SPA: responsive attendance, subject, timetable, and history UI.
- Express API: JWT-authenticated REST endpoints, Zod request validation, account-scoped MongoDB queries.
- MongoDB: users, subjects, recurring timetable slots, generated class sessions, push subscriptions, notification delivery idempotency records.
- Reminder scheduler: Node cron process checks each subscribed user's local time once per minute and looks for class starts exactly 15 minutes ahead. Delivery keys prevent the same class reminder being sent twice by a single shared database.
- Web Push: VAPID-authenticated push messages delivered through the browser's push service to a registered service worker.

## Data rules
- A recurring timetable slot is a weekly template. A ClassSession is a dated instance and preserves attendance history.
- Present and absent count in attendance percentages. Scheduled and cancelled sessions are excluded.
- All subject/session/slot reads and mutations must be scoped to the authenticated user.
- Notification delivery is best effort, not a guarantee of exact arrival time.

## Production topology
Deploy the frontend over HTTPS, the API and scheduler as a persistent Node process, and MongoDB as a managed database with network restrictions and backups. Do not run multiple schedulers without a distributed lock or queue if exactly-once delivery is required. For larger scale, replace the polling scheduler with a durable queue and explicit rescheduling on timetable changes.
