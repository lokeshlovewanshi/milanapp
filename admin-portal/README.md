# Gahoi Milan Admin Portal

A small React app for the three things an admin actually does: sign in,
verify member profiles, and manage the highlighted-profiles rail. Talks
directly to the existing Spring Boot admin API (`/api/v1/admin/**`) - no new
backend beyond one richer profile-detail endpoint (see below).

## Running it

```bash
cp .env.example .env.local
# edit .env.local: VITE_API_BASE_URL should point at your backend
#   local dev:  http://localhost:8080
#   Oracle dev: http://<load-balancer-ip> (or https://dev-api... once TLS is set up)
#   prod:       https://api.gahoimarriage.in

npm install
npm run dev
```

You need an `admin_user` row to log in with - see the bottom of
`sql/2026-08-10_featured_stories.sql` for how to create one (bcrypt hash the
password yourself, insert by hand; there is no default admin on purpose).

## What's here

- **Login** (`/login`) - POST `/api/v1/admin/login`, stores the returned JWT in
  localStorage.
- **Verification Queue** (`/queue`) - the unverified-profiles queue, one-click
  verify.
- **Profile detail** (`/profiles/:id`) - fuller view (photos, age, city,
  education, about) for actually deciding if a profile is real. Backed by a
  new `AdminProfileDetailDTO` (see `backend/.../admin/model/dto/`) - the
  original `AdminProfileSummaryDTO` was deliberately card-sized for the queue
  and didn't carry enough to verify anyone from.
- **Highlighted Profiles** (`/featured`) - add/remove entries in the
  `featured_story` table ("Top Stories" on the member home screen).

## Not built (existing API gaps, not portal bugs)

- No "browse/search all profiles" - only the unverified queue exists as a
  list endpoint today.
- No "unverify" - verification is one-way in the current API.
- No scheduling (`starts_at`/`ends_at`) or deactivating a featured slot
  without removing it - the API only exposes add/remove.

## CORS

The backend's `cors.allowed-origins` defaults to `*`, so this works against
any environment with no config change. If that's ever tightened for
production, add this portal's deployed origin to `CORS_ALLOWED_ORIGINS`.
