# AttendWise deployment and custom-domain checklist

This guide assumes the source has been tested locally. Do not launch publicly until all items in the final checklist are complete.

## 1. Create the database
1. Create a MongoDB Atlas project and cluster.
2. Create a database user with a strong password and only the permissions the app needs.
3. Restrict network access to your backend host where the provider supports stable egress IPs. Avoid broad public access for a production database.
4. Copy the connection URI and replace the password placeholder. Keep it private.
5. Configure automated backups and test a restore plan.

## 2. Deploy the backend and reminder worker
1. Create a persistent Node.js web service on a host that supports long-running processes. Set the service root directory to `backend`.
2. Build/install command: `npm install`.
3. Start command: `npm start`.
4. Set environment variables: `NODE_ENV=production`, `PORT` if required by the host, `MONGO_URI`, a unique random `JWT_SECRET`, `CLIENT_ORIGIN` with the exact HTTPS frontend origin(s) separated by commas, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT=mailto:your-real-contact@example.com`.
5. Generate VAPID keys locally using `npm run push:keys` from the repository root, then set them as secret environment variables in the host. Never commit them.
6. Confirm `https://your-api-host/api/health` returns a healthy JSON response.
7. Use an always-on instance for the reminder scheduler. If the process sleeps or is stopped, server-side reminders cannot be evaluated while it is down. For high reliability, move reminders into a dedicated worker and durable queue.

## 3. Deploy the frontend
1. Create a static-site deployment with root directory `frontend`.
2. Build command: `npm install && npm run build`.
3. Output directory: `dist`.
4. Set `VITE_API_URL=https://your-api-host/api` in the build environment.
5. Deploy and confirm registration/login, subjects, timetable, history, privacy page, terms page, and favicon.

## 4. Connect your custom domain
1. Purchase or use a domain you own through a domain registrar.
2. Add the domain in the frontend hosting dashboard. Add both apex and `www` if desired.
3. Add exactly the DNS records the hosting dashboard provides. Do not guess A, AAAA, CNAME, or TXT values.
4. Add an API subdomain such as `api.yourdomain.com` to the backend host and configure the DNS records it provides.
5. Wait for DNS and certificate provisioning. Confirm HTTPS works for both the frontend and API.
6. Update `VITE_API_URL` to `https://api.yourdomain.com/api`, redeploy the frontend, and update `CLIENT_ORIGIN` on the backend to the exact frontend origins.
7. Test push notifications from the final HTTPS domain because browser push subscriptions are tied to the origin. Re-subscribe devices after changing domains.

## 5. Final launch gate
- [ ] Domain belongs to the operator and DNS is connected.
- [ ] HTTPS certificate is active for frontend and API.
- [ ] Favicon displays on desktop and mobile.
- [ ] No AI-generated branding tag or placeholder marketing metrics are present.
- [ ] Privacy policy contains real operator/contact details, accurate data handling and retention statements, and an effective date.
- [ ] Terms contain reviewed governing-law, contact, and service terms.
- [ ] VAPID keys and JWT secret are unique production secrets, not examples.
- [ ] Database access is restricted and backups are configured.
- [ ] Registration, authentication, access control, attendance math, timetable conflicts, history, CSV import/export, and calendar export are tested.
- [ ] Push delivery is tested on actual supported desktop and mobile browsers at a scheduled 15-minute interval.
- [ ] Error monitoring, backups/restore, account deletion and data export are in place.
- [ ] A human has reviewed the privacy and terms pages for the jurisdiction and actual hosting setup.

This ZIP does not purchase a domain, configure DNS, create hosting accounts, or certify legal compliance. The privacy and terms pages are drafts and must be completed and reviewed before a public launch.
