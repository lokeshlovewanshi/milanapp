import { referenceAPI } from "./api";

// In-memory cache for API-fetched reference options
let optionsCache = null;
let fetchPromise = null;

export async function loadReferenceOptions() {
  if (optionsCache) return optionsCache;
  if (fetchPromise) return fetchPromise;

  fetchPromise = referenceAPI
    .allOptions()
    .then((data) => {
      optionsCache = data || {};
      return optionsCache;
    })
    .catch(() => {
      return {};
    })
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
}

// Auto-trigger background loading
loadReferenceOptions();

// Built-in fallback dictionaries for immediate synchronous formatting
export const HEIGHT_MAP = {
  H_48: `4' 0" (122 cm)`,
  H_49: `4' 1" (124 cm)`,
  H_50: `4' 2" (127 cm)`,
  H_51: `4' 3" (130 cm)`,
  H_52: `4' 4" (132 cm)`,
  H_53: `4' 5" (135 cm)`,
  H_54: `4' 6" (137 cm)`,
  H_55: `4' 7" (140 cm)`,
  H_56: `4' 8" (142 cm)`,
  H_57: `4' 9" (145 cm)`,
  H_58: `4' 10" (147 cm)`,
  H_59: `4' 11" (150 cm)`,
  H_60: `5' 0" (152 cm)`,
  H_61: `5' 1" (155 cm)`,
  H_62: `5' 2" (157 cm)`,
  H_63: `5' 3" (160 cm)`,
  H_64: `5' 4" (163 cm)`,
  H_65: `5' 5" (165 cm)`,
  H_66: `5' 6" (168 cm)`,
  H_67: `5' 7" (170 cm)`,
  H_68: `5' 8" (173 cm)`,
  H_69: `5' 9" (175 cm)`,
  H_70: `5' 10" (178 cm)`,
  H_71: `5' 11" (180 cm)`,
  H_72: `6' 0" (183 cm)`,
  H_73: `6' 1" (185 cm)`,
  H_74: `6' 2" (188 cm)`,
  H_75: `6' 3" (190 cm)`,
  H_76: `6' 4" (193 cm)`,
  H_77: `6' 5" (196 cm)`,
  H_78: `6' 6" (198 cm)`,
  H_79: `6' 7" (201 cm)`,
  H_80: `6' 8" (203 cm)`,
  H_81: `6' 9" (206 cm)`,
  H_82: `6' 10" (208 cm)`,
  H_83: `6' 11" (211 cm)`,
  H_84: `7' 0" (213 cm)`,
};

export const ANNUAL_INCOME_MAP = {
  INR_0_5: "Up to ₹5 Lakh",
  INR_5_10: "₹5 - 10 Lakh",
  INR_10_15: "₹10 - 15 Lakh",
  INR_15_20: "₹15 - 20 Lakh",
  INR_20_25: "₹20 - 25 Lakh",
  INR_25_30: "₹25 - 30 Lakh",
  INR_30_40: "₹30 - 40 Lakh",
  INR_40_50: "₹40 - 50 Lakh",
  INR_50_75: "₹50 - 75 Lakh",
  INR_75_100: "₹75 Lakh - 1 Crore",
  INR_100_200: "₹1 - 2 Crore",
  INR_200_PLUS: "₹2 Crore and above",
};

export const MARITAL_STATUS_MAP = {
  NEVER_MARRIED: "Never Married",
  DIVORCED: "Divorced",
  WIDOWED: "Widowed",
  AWAITING_DIVORCE: "Awaiting Divorce",
  ANNULLED: "Annulled",
};

export const DIET_MAP = {
  VEG: "Vegetarian",
  VEGETARIAN: "Vegetarian",
  NON_VEG: "Non-Vegetarian",
  NON_VEGETARIAN: "Non-Vegetarian",
  EGGETARIAN: "Eggetarian",
  VEGAN: "Vegan",
  JAIN: "Jain Vegetarian",
};

export const MANGLIK_MAP = {
  NO: "No (गैर-मांगलिक)",
  YES: "Yes (मांगलिक)",
  ANSHIK: "Anshik / Partial",
  DONT_KNOW: "Don't Know",
};

export const COMPLEXION_MAP = {
  VERY_FAIR: "Very Fair",
  FAIR: "Fair",
  WHEATISH: "Wheatish",
  WHEATISH_BROWN: "Wheatish Brown",
  DARK: "Dark",
};

export const BLOOD_GROUP_MAP = {
  APLUS: "A+",
  A_: "A-",
  BPLUS: "B+",
  B_: "B-",
  OPLUS: "O+",
  O_: "O-",
  ABPLUS: "AB+",
  AB_: "AB-",
};

export const EMPLOYED_IN_MAP = {
  GOVT: "Government / PSU",
  PRIVATE: "Private Company",
  BUSINESS: "Business / Self Employed",
  DEFENCE: "Defence",
  CIVIL_SERVICES: "Civil Services",
  NGO: "NGO / Social Work",
  NOT_WORKING: "Not Working",
  STUDENT: "Student",
};

export const EDUCATION_MAP = {
  BELOW_10: "Below 10th",
  SSC: "10th / SSC",
  HSC: "12th / HSC",
  DIPLOMA: "Diploma",
  ITI: "ITI",
  BA: "B.A.",
  BCOM: "B.Com",
  BSC: "B.Sc",
  BBA: "BBA",
  BCA: "BCA",
  BE_BTECH: "B.E. / B.Tech",
  BARCH: "B.Arch",
  MBBS: "MBBS",
  BDS: "BDS",
  BAMS: "BAMS",
  BHMS: "BHMS",
  BPHARM: "B.Pharm",
  BPT: "BPT",
  BSC_NURSING: "B.Sc Nursing",
  LLB: "LL.B.",
  BED: "B.Ed",
  BVSC: "B.V.Sc",
  MA: "M.A.",
  MCOM: "M.Com",
  MSC: "M.Sc",
  MBA: "MBA",
  MCA: "MCA",
  ME_MTECH: "M.E. / M.Tech",
  MARCH: "M.Arch",
  MD: "MD",
  MS: "MS",
  MDS: "MDS",
  MPHARM: "M.Pharm",
  LLM: "LL.M.",
  MED: "M.Ed",
  CA: "CA - Chartered Accountant",
  CS: "CS - Company Secretary",
  ICWA_CMA: "ICWA / CMA",
  CFA: "CFA",
  PHD: "Ph.D.",
  MPHIL: "M.Phil",
  OTHER: "Other",
};

export const PROFESSION_MAP = {
  SOFTWARE_ENGINEER: "Software Engineer",
  IT_CONSULTANT: "IT / Software Consultant",
  DATA_SCIENTIST: "Data Scientist / Analyst",
  HARDWARE_ENGINEER: "Hardware / Network Engineer",
  CIVIL_ENGINEER: "Civil Engineer",
  MECHANICAL_ENGINEER: "Mechanical Engineer",
  ELECTRICAL_ENGINEER: "Electrical Engineer",
  DOCTOR: "Doctor / Physician",
  SURGEON: "Surgeon",
  DENTIST: "Dentist",
  AYURVEDIC_DOCTOR: "Ayurvedic / Homeopathic Doctor",
  NURSE: "Nurse",
  PHARMACIST: "Pharmacist",
  PHYSIOTHERAPIST: "Physiotherapist",
  CHARTERED_ACCOUNTANT: "Chartered Accountant",
  COMPANY_SECRETARY: "Company Secretary",
  BANKING: "Banking Professional",
  FINANCE: "Finance / Investment Professional",
  AUDITOR: "Auditor / Accountant",
  LAWYER: "Lawyer / Advocate",
  JUDGE: "Judge / Judicial Services",
  IAS_IPS: "IAS / IPS / IFS",
  GOVT_OFFICER: "Government Officer",
  DEFENCE_OFFICER: "Defence Services Officer",
  POLICE: "Police Services",
  TEACHER: "Teacher",
  PROFESSOR: "Professor / Lecturer",
  RESEARCHER: "Scientist / Researcher",
  ARCHITECT: "Architect",
  INTERIOR_DESIGNER: "Interior Designer",
};

/**
 * Universal code-to-label resolver.
 */
export function formatCode(category, code, customOptions = null) {
  if (code === null || code === undefined || String(code).trim() === "") return "";
  const str = String(code).trim();

  // 1. Check custom / passed options list
  const opts = customOptions || (optionsCache ? optionsCache[category] : null);
  if (Array.isArray(opts)) {
    const match = opts.find((o) => o.code === str || o.code?.toLowerCase() === str.toLowerCase());
    if (match?.label) return match.label;
  }

  // 2. Check static dictionaries
  switch (category) {
    case "height":
      if (HEIGHT_MAP[str]) return HEIGHT_MAP[str];
      if (/^H_\d+$/i.test(str)) {
        const inches = parseInt(str.slice(2), 10);
        if (!isNaN(inches) && inches >= 36 && inches <= 96) {
          const ft = Math.floor(inches / 12);
          const rem = inches % 12;
          const cm = Math.round(inches * 2.54);
          return `${ft}' ${rem}" (${cm} cm)`;
        }
      }
      break;

    case "annual_income":
    case "annualIncome":
      if (ANNUAL_INCOME_MAP[str]) return ANNUAL_INCOME_MAP[str];
      if (/^INR_(\d+)_(\d+)$/i.test(str)) {
        const parts = str.match(/^INR_(\d+)_(\d+)$/i);
        return `₹${parts[1]} - ${parts[2]} Lakh`;
      }
      break;

    case "marital_status":
    case "maritalStatus":
      if (MARITAL_STATUS_MAP[str]) return MARITAL_STATUS_MAP[str];
      break;

    case "diet":
      if (DIET_MAP[str]) return DIET_MAP[str];
      break;

    case "manglik":
      if (MANGLIK_MAP[str]) return MANGLIK_MAP[str];
      break;

    case "complexion":
      if (COMPLEXION_MAP[str]) return COMPLEXION_MAP[str];
      break;

    case "blood_group":
    case "bloodGroup":
      if (BLOOD_GROUP_MAP[str]) return BLOOD_GROUP_MAP[str];
      break;

    case "employed_in":
    case "employedIn":
      if (EMPLOYED_IN_MAP[str]) return EMPLOYED_IN_MAP[str];
      break;

    case "education":
      if (EDUCATION_MAP[str]) return EDUCATION_MAP[str];
      break;

    case "profession":
      if (PROFESSION_MAP[str]) return PROFESSION_MAP[str];
      break;

    default:
      break;
  }

  // 3. Fallback: if it's an underscore code like "SOME_TEXT", convert to Title Case
  if (/^[A-Z0-9_]+$/.test(str) && str.includes("_")) {
    return str
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  return str;
}

export function formatHeight(code, options) {
  return formatCode("height", code, options);
}

export function formatAnnualIncome(code, options) {
  return formatCode("annual_income", code, options);
}

export function formatMaritalStatus(code, options) {
  return formatCode("marital_status", code, options);
}

export function formatDiet(code, options) {
  return formatCode("diet", code, options);
}

export function formatManglik(code, options) {
  return formatCode("manglik", code, options);
}

export function formatComplexion(code, options) {
  return formatCode("complexion", code, options);
}

export function formatBloodGroup(code, options) {
  return formatCode("blood_group", code, options);
}

export function formatEmployedIn(code, options) {
  return formatCode("employed_in", code, options);
}

export function formatEducation(code, options) {
  return formatCode("education", code, options);
}

export function formatProfession(code, options) {
  return formatCode("profession", code, options);
}
