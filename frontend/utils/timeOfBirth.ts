/**
 * Time of birth: stored one way, shown another.
 *
 * The `time_of_birth` column is a MySQL TIME, so the only value it accepts is
 * "HH:mm:ss" in 24-hour form. Nobody in India says "16:30" out loud, though, so
 * every screen renders "04:30 PM".
 *
 * Keeping both conversions here means the edit form, the setup flow and the
 * profile cards cannot drift into disagreeing about what a stored time means -
 * which is how "04:30 PM" ended up being posted to a TIME column in the first
 * place.
 */

/** Date -> "HH:mm:ss", the wire and column format. */
export const toDbTime = (d: Date): string =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;

/**
 * Reads any stored value into 24-hour {hours, minutes}, or null.
 *
 * The TIME column only ever yields "HH:mm:ss", but rows written by the old
 * free-text field - and anything posted directly to the API - can still carry a
 * "04:30 PM". Ignoring the meridiem there would quietly turn an evening birth
 * into a morning one, so it is honoured rather than trimmed off.
 */
const read = (raw: any): { hours: number; minutes: number } | null => {
  if (raw == null || raw === '') return null;

  const text = String(raw).trim();
  const match = /^(\d{1,2}):(\d{2})/.exec(text);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes > 59) return null;

  const meridiem = /\b(AM|PM)\b/i.exec(text)?.[1]?.toUpperCase();
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
  } else if (hours > 23) {
    return null;
  }

  return { hours, minutes };
};

/**
 * Stored value -> Date, for seeding the picker wheels.
 *
 * Falls back to 9:00 AM rather than "now": opening the wheel on the current
 * clock time invites a tap-through that records a birth time of whenever the
 * user happened to be editing their profile.
 */
export const parseDbTime = (raw: any): Date => {
  const d = new Date();
  d.setSeconds(0, 0);

  const parsed = read(raw);
  d.setHours(parsed ? parsed.hours : 9, parsed ? parsed.minutes : 0);
  return d;
};

/** Stored value -> "04:30 PM". Returns '' for anything unreadable. */
export const formatTime = (raw: any): string => {
  const parsed = read(raw);
  if (!parsed) return '';

  const { hours, minutes } = parsed;
  const suffix = hours < 12 ? 'AM' : 'PM';
  // 0 -> 12 AM, 12 -> 12 PM, 13 -> 1 PM.
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(display).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${suffix}`;
};
