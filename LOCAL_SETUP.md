# Running Gahoi Milan locally

Runs the whole app on your Mac with no AWS involved — the EC2 box can stay
stopped. Everything below assumes:

```bash
cd "/Users/harshsijariya/Downloads/marriage-app-main 2"
```

**What you get:** MySQL on localhost with the real schema, the Spring Boot API
on `:8080`, and the Expo app in the Android emulator pointed at it.

**What does not work locally** (and is fine):
- Photo upload still writes to the real S3 bucket, since the AWS keys in
  `application.properties` are live. Everything else is local.
- Google Sign-In needs `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `frontend/.env`.
  Left blank, that button errors — use email/password login instead.
- Push delivery needs Firebase. Notifications are still written to the database
  and show up in the app's bell either way.

---

## Already done on this machine

Verified working, so skip ahead unless something broke:

- MySQL 9.0.1 running via Homebrew, database `marriage_portal` loaded with all
  12 tables and 63 profiles
- Java 17, Node 25, Expo CLI installed
- `backend/.../application.properties` filled in and pointing at localhost
- `frontend/.env` pointed at `http://10.0.2.2:8080`
- Emulator disk cleaned — see [Emulator out of space](#emulator-out-of-space)

Sanity check, all three should pass:

```bash
# Credentials are in the gitignored application.properties; -p prompts for it.
mysql -u test_user -p -e "USE marriage_portal; SHOW TABLES;"
```

---

## 1. Database

If MySQL is not running:

```bash
brew services start mysql
```

Only if the database is missing or you want a clean reload — schema first, then
the migrations **in this order**:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS marriage_portal;"
mysql -u root -p marriage_portal < Dump20260725.sql
cd backend/gahoi-milan-api-feature-h-sijariya/src/main/resources/db
mysql -u root -p marriage_portal < reference_data.sql
mysql -u root -p marriage_portal < created_at.sql
mysql -u root -p marriage_portal < notifications.sql
```

The app runs `ddl-auto=validate`, so it **refuses to start** if the tables do not
match the entities. A startup failure here is almost always a migration that was
not run.

---

## 2. Backend

```bash
cd "backend/gahoi-milan-api-feature-h-sijariya"
./gradlew bootRun
```

First run downloads Gradle 8.11.1 and the dependencies — a few minutes. After
that it starts in about 15 seconds. Leave it running; it hot-restarts on code
changes via devtools.

Confirm it is up, from another terminal:

```bash
curl http://localhost:8080/actuator/health
```

Expect `{"status":"UP"}`.

Credentials come from
`backend/gahoi-milan-api-feature-h-sijariya/src/main/resources/application.properties`,
which is gitignored. If it is ever missing, copy
`application.properties.example` next to it and fill in the blanks — the
`${VAR:default}` syntax means environment variables override it.

To run without Firebase, set `firebase.enabled=false` in that file. Push
delivery is skipped; the notification feed still works.

---

## 3. Emulator

Start it before the app so Metro finds a device:

```bash
~/Library/Android/sdk/emulator/emulator -avd Medium_Phone_API_35
```

Or launch it from Android Studio's Device Manager. The two AVDs available are
`Medium_Phone_API_35` (Android 15, Play Store) and `Pixel_3a_API_29`.

Because the data partitions were just wiped, **the first boot is slow** — two to
four minutes to reach the launcher. That is expected, not a hang.

Confirm the emulator is attached:

```bash
~/Library/Android/sdk/platform-tools/adb devices
```

---

## 4. App

The Gradle build needs to know where the Android SDK is. `frontend/android/` is
gitignored and regenerated, so `local.properties` disappears on a fresh clone
and the build fails with *"SDK location not found"*. Recreate it:

```bash
echo "sdk.dir=$HOME/Library/Android/sdk" > frontend/android/local.properties
```

Worth also putting in `~/.zshrc`, so `adb` and `emulator` are on your PATH:

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

Then:

```bash
cd frontend
npx expo run:android
```

Use `run:android`, **not** Expo Go. The app depends on native modules
(`@react-native-google-signin/google-signin`, `expo-notifications`) that Expo Go
does not bundle. `run:android` compiles a dev build, installs it, and starts
Metro. The first build takes 5–15 minutes; later runs reuse the build and start
in seconds.

Once installed, day to day you only need:

```bash
cd frontend && npx expo start --dev-client
```

### Why `10.0.2.2`

`localhost` inside the emulator means the emulator itself. `10.0.2.2` is the
alias for the host machine — that is the address your Mac's `:8080` is reachable
at from Android. Release builds forbid plain HTTP, but the debug manifest sets
`usesCleartextTraffic="true"`, which is why this works in development only.

On a **physical device over USB**, forward the port instead and set
`EXPO_PUBLIC_BACKEND_URL=http://localhost:8080`:

```bash
adb reverse tcp:8080 tcp:8080
```

`EXPO_PUBLIC_*` values are inlined at build time, so **restart Metro with
`--clear` after editing `.env`**, and rebuild if it still looks stale.

---

## Emulator out of space

This is what was failing. The emulator's copy-on-write overlay
(`userdata-qemu.img.qcow2`) grows with every app install and never shrinks — it
had reached 7.1 GB on the API 35 device and 2.7 GB on the Pixel 3a, 12 GB total.
Wiping the data partition reclaimed about 11 GB.

The safe way is Android Studio → Device Manager → ⋮ → **Wipe Data**.

Equivalent from the terminal, with **every emulator shut down first**:

```bash
AVD=~/.android/avd/Medium_Phone_API_35.avd
rm -f "$AVD"/userdata-qemu.img "$AVD"/userdata-qemu.img.qcow2 \
      "$AVD"/cache.img.qcow2 "$AVD"/encryptionkey.img.qcow2 \
      "$AVD"/*.lock
rm -rf "$AVD"/snapshots && mkdir -p "$AVD"/snapshots
```

This resets the emulator's internal Android state — installed apps and any
accounts signed in *inside the emulator* are gone. Nothing on the Mac is
touched. The partition regenerates clean on next boot.

Or wipe on launch without deleting anything yourself:

```bash
~/Library/Android/sdk/emulator/emulator -avd Medium_Phone_API_35 -wipe-data
```

### If space is still tight

Sizes measured on this machine:

| Path | Was | Safe to delete? |
|---|---|---|
| `~/.gradle/caches` | 12 GB | Yes — re-downloads on next build |
| `~/Library/Android/sdk/system-images` | part of 14 GB | Only unused API levels, via SDK Manager |
| `~/Library/Developer/CoreSimulator` | 5.2 GB | Yes if you do not build iOS: `xcrun simctl delete unavailable` |
| `~/Library/Caches/Yarn` | 1.6 GB | Yes — `yarn cache clean` |
| `frontend/android/build`, `frontend/.metro-cache` | varies | Yes — regenerated |

Keeping ~15 GB free avoids the emulator refusing to boot.

---

## When something breaks

| Symptom | Cause and fix |
|---|---|
| `SDK location not found` | `frontend/android/local.properties` is missing — it is gitignored. Recreate it as shown in step 4. |
| Backend exits at startup with a schema error | A migration was not run. Reload in the order in step 1. |
| `Communications link failure` | MySQL is not running. `brew services start mysql` |
| App shows a network error on every screen | Backend is not running, or `.env` still points at `api.gahoimarriage.in` while EC2 is stopped. Check the `🔧 API Configuration` log Metro prints at startup — it shows the resolved URL. |
| Network error on the emulator only | URL says `localhost` instead of `10.0.2.2`. Fix `.env`, restart Metro with `--clear`. |
| `Cleartext HTTP traffic not permitted` | A release build is being used against `http://`. Rebuild with `expo run:android` (debug). |
| Google button errors immediately | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is blank. Use email/password, or fill it in and rebuild. |
| Emulator will not boot / "not enough space" | Wipe data, above. |
| "System UI isn't responding" right after boot | Normal on the first cold boot after a data wipe — SystemUI is re-initializing. Tap **Wait**. |
| Wrong password returns 500, not 401 | Known backend bug, see [PRD.md](PRD.md) known gaps. The login does reach the server. |
| Metro serves stale code | `npx expo start --clear` |
| Port 8080 already taken | `lsof -ti:8080 -sTCP:LISTEN \| xargs kill`. Keep `-sTCP:LISTEN` — without it `lsof` also matches *clients connected to* 8080, so a running emulator gets killed along with the server. |

---

## Going back to production

Set `frontend/.env` back to:

```
EXPO_PUBLIC_BACKEND_URL=https://api.gahoimarriage.in
```

then restart Metro with `--clear` and rebuild. The EC2 instance has to be
running again for that to resolve. Deployment itself is unchanged —
see [DEPLOY.md](DEPLOY.md).
