import { useState, useEffect, useCallback } from "react";
import { referenceAPI } from "./api";
import {
  HEIGHT_MAP,
  ANNUAL_INCOME_MAP,
  MARITAL_STATUS_MAP,
  DIET_MAP,
  MANGLIK_MAP,
  COMPLEXION_MAP,
  BLOOD_GROUP_MAP,
  EMPLOYED_IN_MAP,
  EDUCATION_MAP,
  PROFESSION_MAP,
  PROFILE_CREATED_BY_MAP,
  GENDER_MAP,
  ZODIAC_MAP,
  NAKSHATRA_MAP,
  MOTHER_TONGUE_MAP,
  CAR_STATUS_MAP,
  HOUSE_STATUS_MAP,
  DISABILITY_MAP,
  BODY_TYPE_MAP,
  FAMILY_STATUS_MAP,
  FAMILY_TYPE_MAP,
  formatCode,
  loadReferenceOptions,
} from "./formatters";

// --- Static Fallback Dictionaries (100% synchronized with database lookup_option & mobile app) ---

export const GENDER_OPTIONS = [
  { code: "MALE", label: "Male" },
  { code: "FEMALE", label: "Female" },
];

export const HEIGHT_OPTIONS = Object.entries(HEIGHT_MAP).map(
  ([code, label]) => ({
    code,
    label,
  }),
);

export const INCOME_OPTIONS = Object.entries(ANNUAL_INCOME_MAP).map(
  ([code, label]) => ({
    code,
    label,
  }),
);

export const MARITAL_STATUS_OPTIONS = Object.entries(MARITAL_STATUS_MAP).map(
  ([code, label]) => ({
    code,
    label,
  }),
);

export const DIET_OPTIONS = [
  { code: "VEG", label: "Vegetarian" },
  { code: "NON_VEG", label: "Non-Vegetarian" },
  { code: "EGGETARIAN", label: "Eggetarian" },
  { code: "VEGAN", label: "Vegan" },
  { code: "JAIN", label: "Jain Vegetarian" },
];

export const MANGLIK_OPTIONS = [
  { code: "NO", label: "No (गैर-मांगलिक)" },
  { code: "YES", label: "Yes (मांगलिक)" },
  { code: "ANSHIK", label: "Anshik / Partial" },
  { code: "DONT_KNOW", label: "Don't Know" },
];

export const COMPLEXION_OPTIONS = Object.entries(COMPLEXION_MAP).map(
  ([code, label]) => ({
    code,
    label,
  }),
);

export const BLOOD_GROUP_OPTIONS = [
  { code: "APLUS", label: "A+" },
  { code: "A_", label: "A-" },
  { code: "BPLUS", label: "B+" },
  { code: "B_", label: "B-" },
  { code: "OPLUS", label: "O+" },
  { code: "O_", label: "O-" },
  { code: "ABPLUS", label: "AB+" },
  { code: "AB_", label: "AB-" },
];

export const EMPLOYED_IN_OPTIONS = Object.entries(EMPLOYED_IN_MAP).map(
  ([code, label]) => ({
    code,
    label,
  }),
);

export const EDUCATION_OPTIONS = Object.entries(EDUCATION_MAP).map(
  ([code, label]) => ({
    code,
    label,
  }),
);

export const PROFESSION_OPTIONS = Object.entries(PROFESSION_MAP)
  .filter(([code]) => code !== "BUSINESS") // filter legacy alias
  .map(([code, label]) => ({
    code,
    label,
  }));

export const PROFILE_CREATED_BY_OPTIONS = [
  { code: "SELF", label: "Self (स्वयं)" },
  { code: "PARENTS", label: "Parents / Guardian (माता-पिता)" },
  { code: "SIBLING", label: "Sibling (भाई / बहन)" },
  { code: "RELATIVE", label: "Relative (रिश्तेदार)" },
  { code: "FRIEND", label: "Friend (मित्र)" },
];

export const ZODIAC_OPTIONS = [
  { code: "MESH", label: "Mesh (Aries) / मेष" },
  { code: "VRISHABH", label: "Vrishabh (Taurus) / वृषभ" },
  { code: "MITHUN", label: "Mithun (Gemini) / मिथुन" },
  { code: "KARK", label: "Kark (Cancer) / कर्क" },
  { code: "SIMHA", label: "Simha (Leo) / सिंह" },
  { code: "KANYA", label: "Kanya (Virgo) / कन्या" },
  { code: "TULA", label: "Tula (Libra) / तुला" },
  { code: "VRISHCHIK", label: "Vrishchik (Scorpio) / वृश्चिक" },
  { code: "DHANU", label: "Dhanu (Sagittarius) / धनु" },
  { code: "MAKAR", label: "Makar (Capricorn) / मकर" },
  { code: "KUMBH", label: "Kumbh (Aquarius) / कुंभ" },
  { code: "MEEN", label: "Meen (Pisces) / मीन" },
];

export const NAKSHATRA_OPTIONS = [
  { code: "ASHWINI", label: "Ashwini (अश्विनी)" },
  { code: "BHARANI", label: "Bharani (भरणी)" },
  { code: "KRITTIKA", label: "Krittika (कृत्तिका)" },
  { code: "ROHINI", label: "Rohini (रोहिणी)" },
  { code: "MRIGASHIRA", label: "Mrigashira (मृगशिरा)" },
  { code: "ARDRA", label: "Ardra (आर्द्रा)" },
  { code: "PUNARVASU", label: "Punarvasu (पुनर्वसु)" },
  { code: "PUSHYA", label: "Pushya (पुष्य)" },
  { code: "ASHLESHA", label: "Ashlesha (आश्लेषा)" },
  { code: "MAGHA", label: "Magha (मघा)" },
  { code: "PURVA_PHALGUNI", label: "Purva Phalguni (पूर्वा फाल्गुनी)" },
  { code: "UTTARA_PHALGUNI", label: "Uttara Phalguni (उत्तरा फाल्गुनी)" },
  { code: "HASTA", label: "Hasta (हस्त)" },
  { code: "CHITRA", label: "Chitra (चित्रा)" },
  { code: "SWATI", label: "Swati (स्वाति)" },
  { code: "VISHAKHA", label: "Vishakha (विशाखा)" },
  { code: "ANURADHA", label: "Anuradha (अनुराधा)" },
  { code: "JYESHTHA", label: "Jyeshtha (ज्येष्ठा)" },
  { code: "MULA", label: "Mula (मूल)" },
  { code: "PURVA_ASHADHA", label: "Purva Ashadha (पूर्वाषाढ़ा)" },
  { code: "UTTARA_ASHADHA", label: "Uttara Ashadha (उत्तराषाढ़ा)" },
  { code: "SHRAVANA", label: "Shravana (श्रवण)" },
  { code: "DHANISHTA", label: "Dhanishta (धनिष्ठा)" },
  { code: "SHATABHISHA", label: "Shatabhisha (शतभिषा)" },
  { code: "PURVA_BHADRAPADA", label: "Purva Bhadrapada (पूर्वाभाद्रपद)" },
  { code: "UTTARA_BHADRAPADA", label: "Uttara Bhadrapada (उत्तराभाद्रपद)" },
  { code: "REVATI", label: "Revati (रेवती)" },
];

export const MOTHER_TONGUE_OPTIONS = [
  { code: "HINDI", label: "Hindi (हिन्दी)" },
  { code: "BUNDELI", label: "Bundeli (बुंदेली)" },
  { code: "BAGHELI", label: "Bagheli (बघेली)" },
  { code: "MARATHI", label: "Marathi (मराठी)" },
  { code: "GUJARATI", label: "Gujarati (गुजराती)" },
  { code: "RAJASTHANI", label: "Rajasthani (राजस्थानी)" },
  { code: "MARWARI", label: "Marwari (मारवाड़ी)" },
  { code: "PUNJABI", label: "Punjabi (पंजाबी)" },
  { code: "BENGALI", label: "Bengali (बंगाली)" },
  { code: "ODIA", label: "Odia (ओडिया)" },
  { code: "ASSAMESE", label: "Assamese (असमिया)" },
  { code: "URDU", label: "Urdu (उर्दू)" },
  { code: "TAMIL", label: "Tamil (तमिल)" },
  { code: "TELUGU", label: "Telugu (तेलुगू)" },
  { code: "KANNADA", label: "Kannada (कन्नड़)" },
  { code: "MALAYALAM", label: "Malayalam (मलयालम)" },
  { code: "KONKANI", label: "Konkani (कोंकणी)" },
  { code: "TULU", label: "Tulu (तुलु)" },
  { code: "SINDHI", label: "Sindhi (सिंधी)" },
  { code: "KASHMIRI", label: "Kashmiri (कश्मीरी)" },
  { code: "NEPALI", label: "Nepali (नेपाली)" },
  { code: "MAITHILI", label: "Maithili (मैथिली)" },
  { code: "BHOJPURI", label: "Bhojpuri (भोजपुरी)" },
  { code: "HARYANVI", label: "Haryanvi (हरियाणवी)" },
  { code: "CHHATTISGARHI", label: "Chhattisgarhi (छत्तीसगढ़ी)" },
  { code: "ENGLISH", label: "English (अंग्रेज़ी)" },
  { code: "OTHER", label: "Other / अन्य" },
];

export const CAR_STATUS_OPTIONS = [
  { code: "OWNED", label: "Owned / कार उपलब्ध है" },
  { code: "NONE", label: "None / कार नहीं है" },
];

export const HOUSE_STATUS_OPTIONS = [
  { code: "OWNED", label: "Owned / स्वयं का मकान" },
  { code: "RENTED", label: "Rented / किराए पर" },
  { code: "ANCESTRAL", label: "Ancestral / पैतृक मकान" },
  { code: "NONE", label: "None / अन्य" },
];

export const DISABILITY_OPTIONS = [
  { code: "NONE", label: "None / कोई नहीं" },
  { code: "PHYSICAL", label: "Physically Challenged / शारीरिक विकलांगता" },
  { code: "OTHER", label: "Other / अन्य" },
];

export const BODY_TYPE_OPTIONS = [
  { code: "SLIM", label: "Slim / पतला" },
  { code: "AVERAGE", label: "Average / सामान्य" },
  { code: "ATHLETIC", label: "Athletic / सुगठित" },
  { code: "HEAVY", label: "Heavy / भारी" },
];

export const FAMILY_STATUS_OPTIONS = [
  { code: "MIDDLE", label: "Middle Class / मध्यम वर्गीय" },
  { code: "UPPER_MIDDLE", label: "Upper Middle Class / उच्च मध्यम वर्गीय" },
  { code: "RICH", label: "Rich / Affluent / समृद्ध" },
];

export const FAMILY_TYPE_OPTIONS = [
  { code: "JOINT", label: "Joint Family / संयुक्त परिवार" },
  { code: "NUCLEAR", label: "Nuclear Family / एकल परिवार" },
];

export const GOTRA_OPTIONS = [];

export const STATE_OPTIONS = [
  { code: "Madhya Pradesh", label: "Madhya Pradesh (मध्य प्रदेश)" },
  { code: "Uttar Pradesh", label: "Uttar Pradesh (उत्तर प्रदेश)" },
  { code: "Maharashtra", label: "Maharashtra (महाराष्ट्र)" },
  { code: "Delhi", label: "Delhi (दिल्ली)" },
  { code: "Rajasthan", label: "Rajasthan (राजस्थान)" },
  { code: "Gujarat", label: "Gujarat (गुजरात)" },
  { code: "Chhattisgarh", label: "Chhattisgarh (छत्तीसगढ़)" },
  { code: "Karnataka", label: "Karnataka (कर्नाटक)" },
  { code: "Telangana", label: "Telangana (तेलंगाना)" },
  { code: "Haryana", label: "Haryana (हरियाणा)" },
  { code: "Punjab", label: "Punjab (पंजाब)" },
  { code: "Bihar", label: "Bihar (बिहार)" },
  { code: "West Bengal", label: "West Bengal (पश्चिम बंगाल)" },
  { code: "Andhra Pradesh", label: "Andhra Pradesh (आंध्र प्रदेश)" },
  { code: "Arunachal Pradesh", label: "Arunachal Pradesh" },
  { code: "Assam", label: "Assam (असम)" },
  { code: "Chandigarh", label: "Chandigarh (चंडीगढ़)" },
  { code: "Goa", label: "Goa (गोवा)" },
  { code: "Himachal Pradesh", label: "Himachal Pradesh (हिमाचल प्रदेश)" },
  { code: "Jammu and Kashmir", label: "Jammu and Kashmir (जम्मू और कश्मीर)" },
  { code: "Jharkhand", label: "Jharkhand (झारखंड)" },
  { code: "Kerala", label: "Kerala (केरल)" },
  { code: "Ladakh", label: "Ladakh (लद्दाख)" },
  { code: "Manipur", label: "Manipur (मणिपुर)" },
  { code: "Meghalaya", label: "Meghalaya (मेघालय)" },
  { code: "Mizoram", label: "Mizoram (मिजोरम)" },
  { code: "Nagaland", label: "Nagaland (नागालैंड)" },
  { code: "Odisha", label: "Odisha (ओडिशा)" },
  { code: "Puducherry", label: "Puducherry (पुडुचेरी)" },
  { code: "Sikkim", label: "Sikkim (सिक्किम)" },
  { code: "Tamil Nadu", label: "Tamil Nadu (तमिलनाडु)" },
  { code: "Tripura", label: "Tripura (त्रिपुरा)" },
  { code: "Uttarakhand", label: "Uttarakhand (उत्तराखंड)" },
  { code: "Andaman and Nicobar Islands", label: "Andaman and Nicobar Islands" },
  {
    code: "Dadra and Nagar Haveli and Daman and Diu",
    label: "Dadra and Nagar Haveli and Daman and Diu",
  },
  { code: "Lakshadweep", label: "Lakshadweep" },
];

// Fallback option mapping for list() helper
const STATIC_CATEGORY_MAP = {
  gender: GENDER_OPTIONS,
  height: HEIGHT_OPTIONS,
  annual_income: INCOME_OPTIONS,
  marital_status: MARITAL_STATUS_OPTIONS,
  diet: DIET_OPTIONS,
  manglik: MANGLIK_OPTIONS,
  complexion: COMPLEXION_OPTIONS,
  blood_group: BLOOD_GROUP_OPTIONS,
  employed_in: EMPLOYED_IN_OPTIONS,
  education: EDUCATION_OPTIONS,
  profession: PROFESSION_OPTIONS,
  profile_created_by: PROFILE_CREATED_BY_OPTIONS,
  rashi: ZODIAC_OPTIONS,
  zodiac: ZODIAC_OPTIONS,
  nakshatra: NAKSHATRA_OPTIONS,
  mother_tongue: MOTHER_TONGUE_OPTIONS,
  car_status: CAR_STATUS_OPTIONS,
  house_status: HOUSE_STATUS_OPTIONS,
  disability: DISABILITY_OPTIONS,
  body_type: BODY_TYPE_OPTIONS,
  family_status: FAMILY_STATUS_OPTIONS,
  family_type: FAMILY_TYPE_OPTIONS,
  gotra: GOTRA_OPTIONS,
  states: STATE_OPTIONS,
};

// Global memory cache for reactive useReference hook
let memoryCache = null;

/**
 * Hook to access reference options with automatic API sync and static fallback.
 */
export function useReference() {
  const [options, setOptions] = useState(memoryCache || {});
  const [loading, setLoading] = useState(!memoryCache);

  useEffect(() => {
    let alive = true;
    loadReferenceOptions()
      .then((data) => {
        if (alive && data) {
          memoryCache = data;
          setOptions(data);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const list = useCallback(
    (category) => {
      const dynamic =
        options[category] || (category === "zodiac" ? options["rashi"] : null);
      if (Array.isArray(dynamic) && dynamic.length > 0) {
        return dynamic;
      }
      return STATIC_CATEGORY_MAP[category] || [];
    },
    [options],
  );

  const label = useCallback(
    (category, code) => formatCode(category, code, list(category)),
    [list],
  );

  return { options, list, label, loading };
}

/**
 * Hook to access database States & Cities from backend reference endpoints.
 */
export function useLocations() {
  const [states, setStates] = useState(STATE_OPTIONS);
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    referenceAPI
      .states()
      .then((res) => {
        const rawList = Array.isArray(res) ? res : res?.data || [];
        if (rawList.length > 0) {
          setStates(
            rawList.map((s) => ({
              code: s.name,
              label: s.name,
              id: s.id,
            })),
          );
        }
      })
      .catch(() => {});
  }, []);

  const loadCities = useCallback(
    async (stateName) => {
      if (!stateName) {
        setCities([]);
        return;
      }
      const match = states.find(
        (s) =>
          s.code?.toLowerCase() === String(stateName).toLowerCase() ||
          s.label?.toLowerCase() === String(stateName).toLowerCase(),
      );
      if (!match?.id) {
        setCities([]);
        return;
      }

      setLoadingCities(true);
      try {
        const res = await referenceAPI.cities({ stateId: match.id });
        setCities(Array.isArray(res) ? res : res?.data || []);
      } catch {
        setCities([]);
      } finally {
        setLoadingCities(false);
      }
    },
    [states],
  );

  return { states, cities, loadCities, loadingCities };
}
