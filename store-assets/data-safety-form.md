# Play Console Data Safety form — answers for Lodha Milan

Matches `docs/privacy-policy.html`. Fill this in under Play Console → App content →
Data safety. Google checks your declaration against what the app actually does, so
if a field changes, update both this file and the policy together.

## Does your app collect or share any of the required user data types?

**Yes.**

## Data types collected

| Category                 | Type                                                                                           | Collected             | Shared                                          | Purpose                                      |
| ------------------------ | ---------------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------- | -------------------------------------------- |
| Personal info            | Name                                                                                           | Yes                   | Yes (with other members, per visibility rules)  | App functionality                            |
| Personal info            | Email address                                                                                  | Yes                   | No                                              | Account management                           |
| Personal info            | Phone number                                                                                   | Yes                   | Yes (only after both sides connect)             | App functionality                            |
| Personal info            | Address                                                                                        | Yes                   | Yes (only after both sides connect)             | App functionality                            |
| Personal info            | Date of birth                                                                                  | Yes                   | Yes                                             | App functionality (matching, kundali)        |
| Personal info            | Other personal info (gender, marital status, gotra, family details, religion/astrology fields) | Yes                   | Yes (per visibility rules)                      | App functionality                            |
| Photos                   | Photos                                                                                         | Yes                   | Yes (per visibility rules, via signed URLs)     | App functionality                            |
| App activity             | App interactions (views, connection requests, shortlists)                                      | Yes                   | No                                              | App functionality, analytics (internal only) |
| App info and performance | Crash logs                                                                                     | No                    | —                                               | —                                            |
| Device or other IDs      | Device ID                                                                                      | Yes (push token only) | Yes (Google/Firebase, to deliver notifications) | App functionality                            |

Notes:

- **No location data** is collected — the app never requests
  `ACCESS_FINE_LOCATION`/`ACCESS_COARSE_LOCATION`. City/state are free-text
  profile fields the member types in, not device location.
- **No financial info, health info, messages content, or web browsing
  history** is collected.
- **No advertising or analytics SDK** is present in the app, so there is no
  third-party ad ID collection and no data used for advertising.

## Is all of the user data collected by your app encrypted in transit?

**Yes** — the release build blocks cleartext HTTP; all API traffic is HTTPS/TLS.

## Do you provide a way for users to request that their data be deleted?

**Yes** — in-app (Account & Settings → Hide/Delete Profile) and via the public
web page linked from the store listing's Privacy Policy URL
(`docs/delete-account.html`).

## Data collection purposes, per type (what to select in the form)

- Name, email, phone, address, DOB, other personal info, photos → **App
  functionality**, **Account management**
- App interactions → **App functionality**
- Device ID (push token) → **App functionality**

Do **not** select "Advertising or marketing", "Fraud prevention, security,
and compliance" as a purpose unless that changes — currently nothing in the
app does either.

## Third parties data is shared with

- **Amazon Web Services (S3)** — photo storage (processor, not a data sale)
- **Google (Firebase Cloud Messaging)** — push notification delivery
- **Google Sign-In** — optional authentication method

None of these are ad networks or data brokers; check "processor" framing
where the form asks whether third parties are given data for their own
purposes (they are not).

## Is data collection optional for any of these types?

Only the **optional profile fields** are optional (weight, complexion,
blood group, about me, partner preferences, "other" details, etc — see
`frontend/components/sectionSchema.ts` for the exact optional/required
split). Name, gender, date of birth, marital status and mobile number are
required to complete a visible profile, so answer "required" for those.
