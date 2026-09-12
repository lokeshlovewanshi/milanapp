import { Share } from 'react-native';
import { profileId, profileName, profileCode, profileImage } from '../components/theme';

export interface ShareOptions {
  isOwnProfile?: boolean;
}

/**
 * Converts raw height codes (e.g., "H_54", "54_H", "H_55", "5.4") into friendly readable strings (e.g. "5 ft 4 in").
 */
export function formatHeight(raw: any): string {
  if (!raw) return '';
  const s = String(raw).trim();
  if (!s || s === '0' || s === 'null' || s === 'undefined' || s === '0 ft 0 in' || s === '1 ft 0 in') {
    return '';
  }

  // 1. Match database reference code: H_<total_inches> (e.g. H_67 -> 67 in = 5 ft 7 in, H_70 -> 70 in = 5 ft 10 in)
  const hCodeMatch = s.match(/^H_(\d{2,3})$/i);
  if (hCodeMatch) {
    const totalInches = parseInt(hCodeMatch[1], 10);
    if (totalInches >= 40 && totalInches <= 90) {
      const ft = Math.floor(totalInches / 12);
      const inch = totalInches % 12;
      return `${ft} ft ${inch} in`;
    }
  }

  // 2. Match reference label format: e.g. "5' 7\" (170 cm)", "5' 7\"", "5'7"
  const labelMatch = s.match(/([4-7])['’]\s*(\d{1,2})/);
  if (labelMatch) {
    const ft = parseInt(labelMatch[1], 10);
    const inch = parseInt(labelMatch[2], 10);
    if (inch < 12) {
      return `${ft} ft ${inch} in`;
    }
  }

  // 3. Fix previously miscalculated pattern like "1 ft 70 in" or "1 ft 63 in"
  const badBugMatch = s.match(/^1\s*ft\s*(\d{2,3})\s*in$/i);
  if (badBugMatch) {
    const val = parseInt(badBugMatch[1], 10);
    // Treat as cm (e.g. 170 -> 5 ft 7 in, 163 -> 5 ft 4 in)
    if (val >= 100 && val <= 250) {
      const totalInches = Math.round(val / 2.54);
      const ft = Math.floor(totalInches / 12);
      const inch = totalInches % 12;
      return `${ft} ft ${inch} in`;
    }
    // Treat as total inches (e.g. 70 -> 5 ft 10 in, 67 -> 5 ft 7 in)
    if (val >= 40 && val <= 90) {
      const ft = Math.floor(val / 12);
      const inch = val % 12;
      return `${ft} ft ${inch} in`;
    }
  }

  // 4. Match explicit feet & inches string: e.g. "5 ft 7 in", "5 feet 7 inches", "5.7", "5_7", "5-7"
  const ftInMatch = s.match(/^([4-7])\s*(?:ft|feet|\.|\-|_)\s*(\d{1,2})\s*(?:in|inch|inches)?$/i);
  if (ftInMatch) {
    const ft = parseInt(ftInMatch[1], 10);
    const inch = parseInt(ftInMatch[2], 10);
    if (inch < 12) {
      return `${ft} ft ${inch} in`;
    }
  }

  // 5. Already clean "X ft Y in"
  if (s.match(/^[4-7]\s*ft\s*\d{1,2}\s*in$/i)) {
    return s;
  }

  // 6. Centimeters format: "170 cm", "163cm", or 3-digit integer "170", "163"
  const cmMatch = s.match(/^(\d{2,3})\s*cm$/i);
  if (cmMatch) {
    const cm = parseInt(cmMatch[1], 10);
    const totalInches = Math.round(cm / 2.54);
    const ft = Math.floor(totalInches / 12);
    const inch = totalInches % 12;
    return `${ft} ft ${inch} in`;
  }
  if (/^\d{3}$/.test(s)) {
    const cm = parseInt(s, 10);
    if (cm >= 100 && cm <= 250) {
      const totalInches = Math.round(cm / 2.54);
      const ft = Math.floor(totalInches / 12);
      const inch = totalInches % 12;
      return `${ft} ft ${inch} in`;
    }
  }

  // 7. Pure 2-digit total inches (e.g. "67" -> 5 ft 7 in, "70" -> 5 ft 10 in)
  if (/^\d{2}$/.test(s)) {
    const totalInches = parseInt(s, 10);
    if (totalInches >= 40 && totalInches <= 90) {
      const ft = Math.floor(totalInches / 12);
      const inch = totalInches % 12;
      return `${ft} ft ${inch} in`;
    }
  }

  if (s.toLowerCase().includes('ft') || s.toLowerCase().includes('in') || s.toLowerCase().includes('cm')) {
    return s;
  }

  return s;
}

/**
 * Converts enum-like code strings (e.g. "SOFTWARE_ENGINEER", "NEVER_MARRIED") into readable capitalized words.
 */
export function cleanValue(val: any): string {
  if (!val) return '';
  const s = String(val).trim();
  if (s.includes('_')) {
    return s
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return s;
}

/**
 * Builds a rich, respectful matrimonial proposal message for a profile.
 */
export function buildProfileShareMessage(profile: any, isOwnProfile = false): string {
  const name = profileName(profile) || 'Member';
  const code = profileCode(profile) || profileId(profile) || '';
  const shareUrl = `https://www.gahoimarriage.in/profile/${code}`;
  const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.jeevanmilansathi.frontend';

  const age = profile?.age ? `${profile.age} yrs` : null;
  const height = profile?.height ? formatHeight(profile.height) : null;
  const education = cleanValue(profile?.education || profile?.qualification);
  const profession = cleanValue(profile?.profession || profile?.occupation);
  const city = cleanValue(profile?.city || profile?.location);
  const gotra = cleanValue(profile?.gotra || profile?.gothram);

  const quickDetails = [age, height, education, profession, city]
    .filter(Boolean)
    .join(' • ');

  if (isOwnProfile) {
    return [
      `🙏 Namaste,`,
      `Check out my marriage profile on Gahoi Parinay 🌸`,
      ``,
      `👤 Name: ${name}`,
      code ? `🆔 Profile ID: ${code}` : '',
      quickDetails ? `📋 Details: ${quickDetails}` : '',
      gotra ? `🌿 Gotra: ${gotra}` : '',
      ``,
      `🔗 View full profile & photos:`,
      `${shareUrl}`,
      ``,
      `📲 Download Gahoi Parinay App:`,
      `${playStoreUrl}`,
    ]
      .filter((line) => line !== '')
      .join('\n');
  }

  return [
    `Hi 👋 ${name} This Side 🙏`,
    ``,
    `I saw your profile on Gahoi Parinay App and found it interesting 🤩`,
    ``,
    `Me & My Family Members 👨‍👩‍👧‍👦 want to discuss further For Marriage. 👫`,
    ``,
    code ? `🆔 Profile ID: ${code}` : '',
    quickDetails ? `📋 Details: ${quickDetails}` : '',
    gotra ? `🌿 Gotra: ${gotra}` : '',
    ``,
    `🔗 Check my profile:`,
    `${shareUrl}`,
    ``,
    `Let Me Know After Checking & if you don't have the app, download here 👇`,
    `${playStoreUrl}`,
  ]
    .filter((line) => line !== '')
    .join('\n');
}

/**
 * Shares a profile with rich link preview card (photo) and complete details.
 */
export async function shareProfile(profile: any, options: ShareOptions = {}): Promise<void> {
  if (!profile) return;

  const { isOwnProfile = false } = options;
  const name = profileName(profile) || 'Gahoi Parinay Profile';
  const message = buildProfileShareMessage(profile, isOwnProfile);
  const title = isOwnProfile
    ? `${name} - Marriage Profile on Gahoi Parinay`
    : `${name} - Gahoi Parinay Marriage Proposal`;

  try {
    await Share.share({
      message,
      title,
    });
  } catch (err: any) {
    if (err?.message && err.message !== 'User did not share') {
      console.log('Share error:', err);
    }
  }
}

/**
 * Builds and shares a structured Kundali summary for a profile without using 'amanglik'.
 */
export async function shareKundali(profile: any, kundaliData?: any): Promise<void> {
  const name = profileName(profile) || 'Gahoi Parinay Member';
  const code = profileCode(profile) || profileId(profile) || '';
  const shareUrl = code ? `https://www.gahoimarriage.in/profile/${code}` : 'https://www.gahoimarriage.in';
  const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.jeevanmilansathi.frontend';

  const rashi = cleanValue(kundaliData?.moon_sign || kundaliData?.rashi || profile?.rashi || 'N/A');
  const nakshatra = cleanValue(kundaliData?.nakshatra || profile?.nakshatra || 'N/A');
  const pada = kundaliData?.nakshatra_pada ? ` (Pada ${kundaliData.nakshatra_pada})` : '';
  const ascendant = cleanValue(kundaliData?.ascendant?.rashi_en || kundaliData?.ascendant?.rashi || profile?.ascendant || 'N/A');
  
  // No "अमांगलिक" in Hindi!
  const manglik =
    kundaliData?.manglik === true
      ? '🔴 मांगलिक (Manglik)'
      : kundaliData?.manglik === false
      ? '🟢 मांगलिक नहीं (Non-Manglik)'
      : 'N/A';

  const lines = [
    `✨ Kundali & Astro Details / जन्म पत्रिका ✨`,
    `👤 Name: ${name}`,
    code ? `🆔 Profile ID: ${code}` : '',
    ``,
    `🌙 Rashi (राशि): ${rashi}`,
    `⭐ Nakshatra (नक्षत्र): ${nakshatra}${pada}`,
    `🌅 Lagna / Ascendant (लग्न): ${ascendant}`,
    `🪐 Manglik Status: ${manglik}`,
    ``,
    `🔗 View full profile & complete Kundali chart:`,
    `${shareUrl}`,
    ``,
    `📲 Gahoi Parinay App: ${playStoreUrl}`,
  ].filter(Boolean);

  const message = lines.join('\n');
  const title = `${name} - Kundali / Astro Details`;

  try {
    await Share.share({ message, title });
  } catch (err: any) {
    if (err?.message && err.message !== 'User did not share') {
      console.log('Kundali share error:', err);
    }
  }
}
