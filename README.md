# AttendWise

A full-stack student attendance and timetable manager built with React, Express, MongoDB, JWT, and Web Push. The UI uses a restrained solid-color design, has no fake metrics or testimonials, includes a favicon, and provides privacy/terms draft pages.

## Features
- Account registration/login with bcrypt password hashing and JWT-authenticated API routes.
- Subject targets, recurring weekly timetable slots with overlap checks, extra classes with conflict checks, date-specific class sessions, attendance history, dashboard calculations, and bunk projections.
- Server-side 15-minute class reminder scheduler using Web Push and a service worker, with optional user opt-in and notification delivery history.
- Image timetable OCR with human review, CSV timetable import with a downloadable template, calendar export (`.ics`), attendance history CSV export, PWA manifest, custom SVG favicon, privacy policy and terms draft pages.
- Zod validation, rate limiting on authentication endpoints, user-scoped queries, generic server-error responses, Docker Compose, API docs, architecture notes, and attendance unit tests.

## Quick start
See [SETUP.md](SETUP.md). Recommended: copy `.env.example` to `.env`, configure `JWT_SECRET`, start Docker Desktop, run `docker compose up --build`, and open `http://localhost:8080`.

## Documentation
- [Setup guide](SETUP.md)
- [Architecture](ARCHITECTURE.md)
- [API reference](API.md)
- [Privacy policy](http://localhost:8080/privacy.html)
- [Terms and conditions](http://localhost:8080/terms.html)

## Honest launch status
This is a deployable development project, not a production-certified service. The custom domain is not connected by this ZIP. Push notifications require VAPID keys and user permission. The legal pages are drafts requiring operator details and review. Automated tests cover attendance math; integration, browser-push, and end-to-end tests still need to be run in the target environment.


## Private administrator portal

Set `ADMIN_EMAIL` to the email address of the one administrator account and set `ADMIN_PASSWORD` to a separate, long, unique password in the root `.env` file. Sign in with that email in AttendWise, open **Admin**, and enter the separate admin password. The server issues a short-lived 20-minute admin token; the normal user token alone cannot read the all-users overview. Never commit `.env` or share the admin password. Use HTTPS before exposing the app to the public internet.
