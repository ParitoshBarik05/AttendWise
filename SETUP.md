# AttendWise setup guide (Windows + VS Code)

## Requirements
- Node.js 20 LTS or newer and npm
- VS Code
- Docker Desktop (recommended) or MongoDB running locally
- A modern browser

## Option A: Docker Compose
1. Extract the ZIP and open the `attendwise` folder in VS Code.
2. Copy `.env.example` to `.env` in the project root.
3. Replace `JWT_SECRET` with a random secret of at least 32 characters. PowerShell can generate one with `-join ((1..64 | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) }))`.
4. Start Docker Desktop and wait until the engine is ready.
5. In the VS Code terminal run `docker compose up --build`.
6. Open `http://localhost:8080`. API health: `http://localhost:8080/api/health`.
7. Stop with `Ctrl+C`, then `docker compose down`. The named MongoDB volume remains. `docker compose down -v` deletes stored data.

## Option B: Run frontend/backend separately
1. Copy `backend/.env.example` to `backend/.env` and set `MONGO_URI`, `JWT_SECRET`, and `CLIENT_ORIGIN=http://localhost:5173`. For Vite, the API is proxied from `/api` to port 5000.
2. Install dependencies from the root: `npm install`, `npm --prefix backend install`, and `npm --prefix frontend install`.
3. Start MongoDB locally or create a MongoDB Atlas database and set its URI in `backend/.env`.
4. Run `npm run dev` from the project root.
5. Open `http://localhost:5173`. API health: `http://localhost:5000/api/health`.

## Timetable imports
The Timetable page supports CSV import and image OCR. Create subjects first, then import a CSV with columns `subject,weekday,startTime,endTime,room`, or choose a clear PNG/JPG/WEBP image. OCR uses Tesseract.js in the browser and only proposes rows it can match to existing subjects and recognizable day/time ranges. Review and correct every row before importing. Grid-style timetable photos may not be parsed reliably, so CSV is the recommended bulk-import format.

## Enable 15-minute push reminders
Push reminders require VAPID keys. In the project root run `npm run push:keys`. Copy the printed public/private keys into `backend/.env` (or root `.env` when using Docker Compose) as `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`. Set `VAPID_SUBJECT` to a valid `mailto:you@example.com` address. Restart the backend. In the app, sign in and click **Enable reminders**. Allow notifications in the browser prompt.

For local development, `localhost` is treated as a secure context by modern browsers. A deployed site must use HTTPS. The scheduler checks each minute for recurring timetable slots and extra sessions starting in 15 minutes, using the account timezone (default `Asia/Kolkata`). The OS/browser may delay delivery or block it; this is not a guaranteed alarm clock. Keep the backend scheduler process running continuously. When a timetable class is cancelled for a date, open Attendance for that date and mark it Cancelled so the reminder is skipped.

## Tests and build checks
- `npm test` runs attendance unit tests.
- `npm --prefix frontend run build` builds the frontend.
- `npm --prefix backend test` runs backend unit tests.

## Before public launch
1. Register and connect your own custom domain with your hosting provider; configure DNS and HTTPS.
2. Replace the draft privacy policy and terms with reviewed versions containing the real operator/contact details, effective dates, applicable law, and actual data-retention/deletion behavior.
3. Set a real favicon/brand if desired, remove development secrets, rotate any exposed keys, restrict CORS, configure rate limiting on all sensitive routes, and set secure production environment variables.
4. Use a managed database with least-privilege credentials, backups, and restricted network access.
5. Add account deletion and data export, password reset/email verification, CSRF protections where cookie auth is used, monitoring, error reporting, and deployment CI/CD before accepting real users.
6. Verify the deployed application with a real device/browser and test push delivery with a class scheduled exactly 15 minutes ahead.

A domain cannot be connected automatically by this source ZIP. You need to own a domain and have access to the DNS and hosting accounts. The legal pages included are drafts, not legal advice, and must be reviewed before public launch.


## Private administrator access

1. Open the root `.env` file beside `docker-compose.yml` (do not commit or share this file).
2. Add `ADMIN_EMAIL=the-exact-email-you-use-for-your-AttendWise-account`.
3. The administrator must register or sign in with that exact email address. The backend checks this setting for every `/api/admin` request; hiding the Admin navigation in the frontend is not the security control.
4. Rebuild/restart with `docker compose up -d --build backend frontend`.
5. Sign in again. The Admin item appears for the configured account. The dashboard exposes registered users, subjects, and attendance history, so protect the account and never share its token.

## Two-hour class slots

New recurring timetable slots and extra classes with an exact two-hour duration are automatically split into two independent one-hour records. Existing two-hour recurring slots should be deleted and re-added after updating so they are split correctly. Existing historical records are not rewritten.

## Timetable PDF import

In Timetable, use the image/PDF import panel. It renders PDF pages in the browser and OCR suggests timetable rows. OCR may not correctly read every layout; review and correct every suggested row before importing. PDFs with selectable text but complex tables may still require manual correction or the CSV import.
