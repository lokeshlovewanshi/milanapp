# Gahoi Milan — Product Requirements Document

A matrimonial (matchmaking) mobile app for the Gahoi community. Members create a
detailed profile, browse and search other members, express interest, and connect
once interest is mutual.

| | |
|---|---|
| Platform | Android (primary), iOS (project exists, unreleased) |
| Frontend | Expo / React Native 0.81, expo-router, TypeScript |
| Backend | Spring Boot 3 (Java 17), Gradle, REST at `/api/v1` |
| Database | MySQL 8 (`marriage_portal`) |
| Photo storage | AWS S3 (`gahoi-milan-photos`, ap-south-1) |
| Push | Firebase Cloud Messaging (optional — degrades to in-app only) |
| Auth | Email + password (JWT), or Google Sign-In |
| Production API | `https://api.gahoimarriage.in` |
| Package / bundle id | `com.jeevanmilansathi.frontend` |

---

## 1. Problem

Matchmaking inside the Gahoi community happens through relatives, community
directories, and WhatsApp forwards. That process is slow, the information is
stale, and it leaks personal details to people who have no reason to see them.
Families want a directory that is limited to the community, current, and where
contact happens only after both sides agree.

## 2. Goals

1. A member can publish a complete, structured profile in one sitting.
2. A member can find relevant matches by the attributes families actually filter
   on — community, caste/gotra, city, education, income, marital status.
3. Interest is **mutual before it is actionable**: a like is private until the
   other side accepts.
4. Nothing that identifies a member is public. Everything sits behind a login.

## 3. Non-goals

- Chat / messaging. Connection hands off to phone contact, not an inbox.
- Payments, subscriptions, or paid boosts.
- Web app. `react-native-web` is present but the web target is not a release
  surface — notably `CORS_ALLOWED_ORIGINS` is `*`, which is acceptable only
  because there is no browser client.
- Algorithmic match scoring. Discovery is filter-driven, not ranked.

## 4. Users

| Role | Description |
|---|---|
| Member | The person seeking a match. Usually the candidate; often a parent or sibling operating the account on their behalf. |
| Admin | Operates the community. Broadcasts announcements via `POST /api/v1/notifications/broadcast`, guarded by the `X-Admin-Secret` header. No admin UI — API only. |

Assume mixed technical confidence and mid-range Android devices. Screens are
form-heavy, so field validation must be forgiving and errors must be readable.

---

## 5. Features

### 5.1 Accounts and authentication

- **Register** with name, email, password, mobile number → `POST /auth/signup`
- **Login** with email + password → `POST /auth/login`, returns a JWT
- **Google Sign-In** → the app sends only Google's signed ID token to
  `POST /auth/google`; the server verifies it and derives identity from the
  verified claims, so the client cannot spoof name or email. The token's `aud`
  must match a configured client ID in `google.oauth.client-ids`.
- JWT is stored in `AsyncStorage` under `auth_token` and attached by an axios
  interceptor. Expiry is 24h (`security.jwt.expiration-time=86400000`).
- Logout unregisters the device's FCM token so the next account on that device
  does not inherit the previous member's pushes.

Screens: [login.tsx](frontend/app/login.tsx),
[register.tsx](frontend/app/register.tsx),
[index.tsx](frontend/app/index.tsx) (routes to the right place on launch).

### 5.2 Profile

A profile is split into five groups, each with its own GET and PATCH endpoint so
a single section can be edited without resubmitting the whole record:

| Group | Endpoint | Holds |
|---|---|---|
| Basic | `/user/profile/basic` | name, DOB, gender, height, marital status, about |
| Contact | `/user/profile/contact` | mobile, email, state, city, address |
| Religion | `/user/profile/religion` | religion, caste, gotra, manglik |
| Education | `/user/profile/education` | qualification, occupation, income |
| Family | `/user/profile/family` | father, mother, siblings, family type/status |

- **First-time setup** is a guided multi-step flow
  ([profile-setup.tsx](frontend/app/profile-setup.tsx)); later changes go
  through [edit-profile.tsx](frontend/app/edit-profile.tsx).
- **Profile completion** is scored server-side from the
  `profile_completion_weight` table and shown as a percentage, to push members
  toward filling the fields that matter for search.
- **Photos** upload to S3 via a presigned URL (`/attachment/generate-upload-url`)
  with a direct multipart fallback (`/attachment/upload`). One photo can be set
  primary (`PUT /attachment/{id}/set-primary`) and is used as the card image
  everywhere.
- **Dropdown values are server-owned.** `/reference/options` returns every list
  in one call, plus `/reference/states` and `/reference/cities`, so adding a
  caste or a city does not require an app release.

### 5.3 Discovery

- **Home** ([(tabs)/home.tsx](frontend/app/(tabs)/home.tsx)) — recommended
  profiles, paginated (`GET /users?page&size`).
- **All profiles** ([all-profiles.tsx](frontend/app/all-profiles.tsx)) — the
  full browsable directory.
- **Search** ([search.tsx](frontend/app/search.tsx) →
  [search-results.tsx](frontend/app/search-results.tsx)) — filter by age, city,
  education, marital status, income, caste.
- **Profile detail** ([profile-detail/[id].tsx](frontend/app/profile-detail/[id].tsx))
  — the full record, with like / shortlist actions.
- **Viewing a profile is recorded** (`POST /views`), which powers Recent
  Visitors. Members should understand that browsing is not anonymous.

### 5.4 Interest and connection

The core loop, deliberately two-sided:

1. A sends interest to B → `POST /likes/{id}`. It is **private to B**; A appears
   in B's received list, nowhere else.
2. B accepts (`POST /likes/accept/{id}`) or declines (`POST /likes/reject/{id}`).
3. On accept, both sides are connected and contact details become actionable.

- A duplicate like returns `400 "…already liked…"`. The client treats this as
  success (`isAlreadyLiked` in [api.ts](frontend/utils/api.ts:138)) rather than
  rolling the button back — the user's intended state is already true.
- **Likes** tab ([(tabs)/likes.tsx](frontend/app/(tabs)/likes.tsx)) shows both
  received (`GET /likes`) and sent (`GET /likes/me`).
- **Shortlist** ([(tabs)/shortlist.tsx](frontend/app/(tabs)/shortlist.tsx)) is a
  private bookmark. The other member is never told.
- **Recent visitors** ([recent-visitors.tsx](frontend/app/recent-visitors.tsx))
  lists who opened your profile.

### 5.5 Notifications

- Events: someone liked you, someone accepted, someone viewed your profile, plus
  admin broadcasts.
- Every notification is **written to the database first**, then pushed via FCM.
  Push is best-effort: with `firebase.enabled=false` the bell still works and
  only delivery is skipped. This is what makes local development possible
  without a Firebase project.
- In-app: [notifications.tsx](frontend/app/notifications.tsx), with
  `/notifications/unread-count` driving the badge and `/notifications/read-all`
  clearing it.

---

## 6. Data model

Tables in `marriage_portal`:

| Table | Purpose |
|---|---|
| `user_profile` | The member and every profile field. Also the auth record. |
| `attachment` | Uploaded photos, S3 keys, primary flag |
| `profile_likes` | Interest, with accepted/rejected state |
| `shortlist` | Private bookmarks |
| `views` | Profile view history |
| `notifications` | Notification feed, read state |
| `device_tokens` | FCM tokens per user per device |
| `token_blacklist` | Revoked JWTs (logout) |
| `lookup_option` | Every dropdown list, keyed by category |
| `state`, `city` | Location reference data |
| `profile_completion_weight` | Per-field weighting for the completion score |

Schema is **not** managed by Hibernate. Local/dev uses
`ddl-auto=validate` (refuses to start on a schema mismatch — a startup failure
is almost always a migration that was not run); production uses `none`. Changes
ship as SQL under `src/main/resources/db/`.

---

## 7. Non-functional requirements

**Security**
- Every endpoint requires a JWT except `/auth/**` and `/actuator/health`.
- Google ID tokens are verified server-side against the allowed `aud` list.
- Broadcast requires `X-Admin-Secret`; blank config disables the endpoint.
- Release builds forbid cleartext HTTP (`usesCleartextTraffic: false`); only
  debug builds permit it, so the emulator can reach `http://10.0.2.2:8080`.

**Privacy**
- No profile data is reachable without authentication.
- Contact details are meaningful only after a mutual accept.
- Shortlisting is invisible to the person shortlisted; viewing is not.

**Performance**
- Listings are paginated; default page size 20.
- API client timeout is 10s.
- Photos are resized client-side before upload
  ([usePhotoUpload.ts](frontend/utils/usePhotoUpload.ts)).

**Operational**
- `/actuator/health` is public so the deploy gate can reach it.
- Deploys are health-gated with automatic rollback to the previous jar.
- The prod profile reads one JSON secret from AWS Secrets Manager
  (`gahoi-milan/prod`) at startup via the instance role. Absent that profile no
  AWS call is made, which is what keeps local development self-contained.

---

## 8. Known gaps

Carried forward from [DEPLOY.md](DEPLOY.md) and the current code:

- `CORS_ALLOWED_ORIGINS` is `*` — must be tightened before any web client.
- The AWS key in the committed `application.properties` was exposed in git
  history and needs rotating; the instance role has already replaced it in prod.
- **Failed login returns `500 Internal Server Error` with `"detail":"User not
  found"`**, where it should return `401 Unauthorized`. Two problems: the client
  cannot distinguish bad credentials from a server fault, and the response
  discloses whether an email is registered.
- No admin UI. Broadcast is a raw API call.
- No message/chat surface after a connection is made.
- No account deletion or data-export flow.
- iOS is unshipped and untested end to end.
