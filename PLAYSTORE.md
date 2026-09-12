# Publishing Gahoi Milan to the Play Store

Audited against the actual project on 7 Aug 2026, not from a generic checklist.
Everything marked ✅ was verified against the build; ❌ and ⚠️ are open.

---

## The one that decides your schedule

**A new personal Play Console developer account cannot publish to production
until it has run a closed test with at least 12 testers who stayed opted in for
14 continuous days.**

Not 12 installs - 12 accounts continuously enrolled for a fortnight. The clock
resets if you drop below twelve. So the earliest possible production date is
about two weeks after you get twelve people onto a closed track, regardless of
how ready the code is.

Organisation accounts are exempt. If Gahoi Milan is going out under a registered
entity rather than your personal name, that route avoids the wait entirely and
is worth deciding before you pay the \$25.

**Start the closed test first, fix the rest during the fortnight.**

---

## Technical state

| | Status |
| --- | --- |
| `targetSdk` 36 | ✅ Play requires 35+ for new apps |
| `minSdk` 24 | ✅ covers ~99% of devices |
| AAB output | ✅ the `production` profile builds `app-bundle` |
| Cleartext HTTP blocked in release | ✅ enforced by `app.config.js` |
| Permissions justifiable | ✅ fixed - see below |
| App icon square | ✅ fixed - was 512x513 |
| R8 minification | ⚠️ enabled but never runtime-tested |
| Play App Signing vs Google Sign-In | ⚠️ **will break sign-in if ignored** |
| Privacy policy | ❌ mandatory, does not exist |
| Web account-deletion page | ❌ mandatory, does not exist |
| Data Safety form | ❌ not filled |
| Store listing assets | ❌ not produced |

### Permissions - fixed

The manifest was requesting `RECORD_AUDIO` and `SYSTEM_ALERT_WINDOW`. Both come
from Expo's template defaults, neither is used by any code in this app, and both
are exactly the kind of thing that draws a policy review: a matrimony app asking
for the microphone and permission to draw over other apps has no answer when
Google asks why.

Blocked via `android.blockedPermissions` in `app.json` and verified gone from the
merged release manifest. What remains, and the answer for each if asked:

| Permission | Why |
| --- | --- |
| `INTERNET`, `ACCESS_NETWORK_STATE` | talks to the API |
| `CAMERA` | profile photo capture (`expo-image-picker`) |
| `READ/WRITE_EXTERNAL_STORAGE` | choosing an existing photo on API < 33 |
| `POST_NOTIFICATIONS` | match and connection-request alerts |
| `VIBRATE`, `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED` | FCM delivery |
| `READ_APP_BADGE` | unread count on the launcher icon |

### Play App Signing will break Google Sign-In

This is the one that bites after a successful upload, when everything looked
fine in testing.

Play re-signs your AAB with **its own** key. The APK a user installs is
therefore signed with a certificate that is **not** your EAS keystore
(`37c44c80…`), and Google Sign-In matches the app by package name + signing
certificate. Result: sign-in works in every internal build and fails for every
Play install, with `DEVELOPER_ERROR`.

**Fix, after your first upload:**

1. Play Console → *Setup → App signing* → copy the **SHA-1 of the app signing
   certificate** (not the upload certificate)
2. Firebase Console → *Project settings* → `com.jeevanmilansathi.frontend` →
   *Add fingerprint*
3. No re-download of `google-services.json` needed - Google Sign-In matches
   server-side and never reads that file

You now have three fingerprints registered, which is correct: EAS release,
local debug, and Play. Add each new one to `GOOGLE_OAUTH_CLIENT_IDS` if the
console creates a new Android OAuth client for it.

### R8 is untested

Minification is on and cuts the download substantially, but the release build
has never been run. Google Sign-In and the notification handlers are the
reflection-heavy paths most likely to break under R8, and both are core flows.

**Install the release APK on a real device and exercise sign-in, photo upload
and push before uploading anything.** If sign-in fails on release but works in
debug, R8 is the cause, not your Google config.

---

## Policy requirements

### Privacy policy - mandatory, blocking

You collect name, email, phone, date of birth, address, family details and
photographs. There is no way to publish without a policy URL, and it must be
reachable publicly without a login.

It has to state what you collect, why, who it is shared with (AWS S3, Firebase),
retention, and how to request deletion.

### Account deletion - mandatory, blocking

Play requires **two** routes for any app with accounts:

1. **In app** - ✅ built. Profile tab → "Delete my account".
2. **A public web URL** where someone can request deletion *without installing
   the app* - ❌ missing. A simple page on `gahoimarriage.in` with a form or an
   email address satisfies this.

Note your deletion is a soft delete: `deleted_at` is stamped, the row survives
because likes, views and notifications reference it. That is fine, but the
privacy policy must describe what is retained and for how long, and you should
add a purge job for genuinely expired records.

### Data Safety form

Declare at minimum: name, email address, phone number, photos, date of birth,
address, and "other personal info" (gotra, family details). Mark data as
encrypted in transit (true - HTTPS enforced) and state that users can request
deletion (true).

Getting this wrong is a common cause of removal *after* a successful launch,
because Google compares your declaration against what the app actually does.

### Dating and matrimony category

Play applies extra scrutiny here. Expect to declare an 18+ target age, complete
the content rating questionnaire honestly, and be ready to describe your
moderation approach. You already have a `status` column with a
`PENDING`/`APPROVED` workflow - be able to explain who reviews profiles and how
abuse is reported.

**There is currently no in-app report or block feature.** For a platform where
adults contact each other, that is a genuine gap on both policy and safety
grounds, and I would not launch without it.

### Screenshots are blocked

`FLAG_SECURE` is set, so the app cannot be screenshotted or screen-recorded.
That is deliberate and defensible for a platform showing members' photos and
phone numbers, but be aware it also blocks Google's review tooling in some
cases. If a review is rejected for "unable to evaluate", this is the first
thing to explain in your appeal.

---

## Store listing assets - none exist yet

| Asset | Requirement |
| --- | --- |
| App icon | 512x512 PNG, 32-bit. ✅ fixed today |
| Feature graphic | 1024x500 PNG/JPG, no alpha. ❌ |
| Phone screenshots | 2-8, min 320px, 16:9 or 9:16. ❌ |
| Short description | 80 chars |
| Full description | 4000 chars |

Screenshots are worth doing properly - they are most of the install decision.
Home feed, a profile, search, and the kundali chart would tell the story well.

---

## Order to do this in

1. **Decide personal vs organisation account** - this sets your timeline
2. Start the closed test with 12 testers (the 14-day clock starts now)
3. Write the privacy policy and the web deletion page
4. Test the release build on a real device: sign-in, upload, push
5. Add report/block
6. Produce store assets
7. Fill Data Safety and content rating
8. After first upload: add the Play signing SHA-1 to Firebase
9. Promote to production

Steps 3-7 fit comfortably inside the fortnight step 2 costs you. Step 8 cannot
be done before an upload exists, so plan to verify Google Sign-In again on the
first Play-signed build rather than assuming it carries over.
