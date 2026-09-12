#!/usr/bin/env bash
# Run from the repo root:  bash COMMIT_STEPS.sh
#
# The .gitignore and application.properties.example are already prepared.
# This only does the parts that need write access to .git/, which the
# assistant's sandbox could not do.
set -e

# 1. A crashed git process left a lock behind on 31 Jul. It is zero bytes and
#    a day old, so nothing is using it.
rm -f .git/index.lock

# 2. Metro's cache was committed by mistake - untrack it, keep it on disk.
git rm -r --cached frontend/.metro-cache --quiet 2>/dev/null || true

# 3. Stage everything the new .gitignore allows.
git add -A

# 4. Last check: nothing sensitive is about to go up.
echo "--- verifying no secrets staged ---"
if git diff --cached --name-only | grep -iE 'src/main/resources/application\.properties$|firebase-service-account|\.keystore$|^Dump.*\.sql$'; then
  echo "STOP: something sensitive is staged. Do not commit."
  exit 1
fi
echo "clean"

git commit -m "Add photo cropper, profile detail from schema, newest-first listings

Frontend
- In-app crop screen with pinch-zoom and a fixed 3:4 frame; every photo
  surface now derives its height from PHOTO_ASPECT, so nothing re-crops
  what the user framed
- Profile detail and own profile render rows from sectionSchema, so any
  saved field appears instead of only the hand-listed ones
- Time of birth is a clock picker storing HH:mm:ss, matching the TIME column
- Shared usePhotoUpload hook replaces two copies of the picker/upload code

Backend
- user_profile.created_at and shortlist.shortlisted_at, with a backfill
  migration, so listings can be ordered newest-first
- Profiles, likes and shortlists all sort newest-first
- The caller's own profile is excluded from listings, plus guards against
  liking or shortlisting yourself

Housekeeping
- application.properties is no longer tracked; use the .example template
- Ignore generated native dirs, build output and Metro cache"

echo
echo "--- committed. pushing ---"
git push origin main
