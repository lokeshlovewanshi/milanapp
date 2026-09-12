import { SECTIONS, type SectionSpec } from './sectionSchema';
import type { DetailRow } from './DetailCard';
import type { LabelFn } from './theme';
import { formatTime } from '../utils/timeOfBirth';

/**
 * Icon per profile field.
 *
 * Keyed by the same field names the schema and the DTOs use, so a field added
 * to sectionSchema only needs an entry here to render with the right glyph -
 * and still renders with a sensible default if it does not get one.
 */
const ICONS: Record<string, string> = {
  // Basic
  name: 'person-outline',
  gender: 'male-female-outline',
  dateOfBirth: 'calendar-outline',
  height: 'resize-outline',
  weight: 'barbell-outline',
  maritalStatus: 'heart-outline',
  profileCreatedBy: 'create-outline',
  complexion: 'color-palette-outline',
  diet: 'restaurant-outline',
  bloodGroup: 'water-outline',
  disability: 'accessibility-outline',

  // Contact
  mobileNo: 'call-outline',
  whatsappNo: 'logo-whatsapp',
  city: 'location-outline',
  state: 'map-outline',
  country: 'earth-outline',
  presentAddress: 'home-outline',
  permanentAddress: 'business-outline',

  // Education & career
  education: 'school-outline',
  educationDetails: 'library-outline',
  profession: 'briefcase-outline',
  occupationDetails: 'document-text-outline',
  employedIn: 'people-outline',
  organization: 'business-outline',
  workCity: 'navigate-outline',
  annualIncome: 'wallet-outline',
  occupationStartDate: 'time-outline',

  // Religion & astro
  gotra: 'flower-outline',
  aakna: 'leaf-outline',
  motherTongue: 'language-outline',
  timeOfBirth: 'time-outline',
  placeOfBirth: 'pin-outline',
  zodiac: 'moon-outline',
  manglik: 'sparkles-outline',
  nakshatra: 'star-outline',

  // Family
  fathersName: 'man-outline',
  fathersOccupation: 'briefcase-outline',
  fathersContactNo: 'call-outline',
  mothersName: 'woman-outline',
  mothersOccupation: 'briefcase-outline',
  marriedBrothers: 'people-circle-outline',
  unmarriedBrothers: 'people-circle-outline',
  marriedSisters: 'people-circle-outline',
  unmarriedSisters: 'people-circle-outline',
  maternalUnclesName: 'person-outline',
  maternalUnclesAakna: 'leaf-outline',
  houseStatus: 'home-outline',
  carStatus: 'car-outline',
  aboutMyself: 'chatbox-ellipses-outline',
  partnerPreferences: 'heart-circle-outline',
};

/** Fields the card renders with a prefix, because the bare value is ambiguous. */
const PREFIX: Record<string, string> = {
  gotra: 'Gotra',
  aakna: 'Aakna',
  maternalUnclesAakna: "Maternal uncle's aakna",
  marriedBrothers: 'Married brothers:',
  unmarriedBrothers: 'Unmarried brothers:',
  marriedSisters: 'Married sisters:',
  unmarriedSisters: 'Unmarried sisters:',
  weight: 'Weight:',
  timeOfBirth: 'Born at',
  placeOfBirth: 'Born in',
};

const formatDate = (raw: any): string => {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

/**
 * Turns a saved profile into display rows for one section.
 *
 * Driven by sectionSchema rather than a hand-written list per screen. The
 * hand-written version silently dropped fields the user had filled in -
 * college, role details and similar - because nobody remembered to add them to
 * both profile screens. Now anything in the schema that has a value is shown,
 * and anything empty is skipped.
 */
export function sectionRows(
  spec: SectionSpec,
  profile: any,
  label?: LabelFn
): DetailRow[] {
  const rows: DetailRow[] = [];

  for (const field of spec.fields) {
    // Rendered as the card's body, not a row.
    if (field.key === 'aboutMyself') continue;

    const raw = profile?.[field.key];
    if (raw == null || raw === '') continue;

    // A zero sibling count is noise, not information.
    if (field.kind === 'number' && Number(raw) === 0) continue;

    let value: string;
    if (field.kind === 'date') {
      value = formatDate(raw);
    } else if (field.kind === 'time') {
      // Stored 24-hour to satisfy the TIME column; read back as "04:30 PM".
      value = formatTime(raw);
    } else if (field.lookup && label) {
      value = label(field.lookup, String(raw)) || String(raw);
    } else {
      value = String(raw);
    }

    if (!value.trim()) continue;

    const prefix = PREFIX[field.key];
    rows.push({
      icon: (ICONS[field.key] ?? 'ellipse-outline') as any,
      value: prefix ? `${prefix} ${value}` : value,
    });
  }

  return rows;
}

/** Convenience: rows for a section by key. */
export function rowsFor(sectionKey: string, profile: any, label?: LabelFn): DetailRow[] {
  const spec = SECTIONS[sectionKey];
  return spec ? sectionRows(spec, profile, label) : [];
}
