/**
 * Declarative description of the five editable profile sections.
 *
 * The edit screen renders from this rather than hand-writing five near-identical
 * forms. Adding a field is one entry here; nothing else changes.
 *
 * `key` matches the DTO property the backend expects, so the payload is built by
 * picking these keys straight off the form state.
 * `lookup` names a category in the lookup_option table - the picker is fed from
 * /reference/options, never a hardcoded array.
 */

export type FieldKind =
  | "select"
  | "multiselect"
  | "text"
  | "textarea"
  | "number"
  | "date"
  /** Clock wheel. Stored as "HH:mm:ss" to match the MySQL TIME column. */
  | "time"
  | "chips";

export type FieldSpec = {
  key: string;
  label: string;
  /** Blocks Save until it has a value, and is shown with a red asterisk. */
  required?: boolean;
  kind: FieldKind;
  /** lookup_option category, for select/multiselect/chips. */
  lookup?: string;
  placeholder?: string;
  /** Show the first N options as tappable chips under the field. */
  suggest?: number;
  /** Options come from the server as the user types. See OptionSheet.onSearch. */
  remote?: "city";
  keyboard?: "default" | "numeric" | "phone-pad";
};

export type SectionSpec = {
  key: string;
  title: string;
  subtitle: string;
  /** profileAPI method names for load and save. */
  get:
    | "getBasicInfo"
    | "getContactInfo"
    | "getEducationInfo"
    | "getReligionInfo"
    | "getFamilyInfo";
  patch:
    | "updateBasicInfo"
    | "updateContactInfo"
    | "updateEducationInfo"
    | "updateReligionInfo"
    | "updateFamilyInfo";
  fields: FieldSpec[];
};

export const SECTIONS: Record<string, SectionSpec> = {
  basic: {
    key: "basic",
    title: "Basic details",
    subtitle: "Update these details to get suitable matches",
    get: "getBasicInfo",
    patch: "updateBasicInfo",
    fields: [
      {
        key: "name",
        label: "Full name / नाम",
        kind: "text",
        placeholder: "Your name",
        required: true,
      },
      {
        key: "gender",
        label: "Gender / लिंग",
        kind: "chips",
        lookup: "gender",
        required: true,
      },
      {
        key: "dateOfBirth",
        label: "Date of birth / जन्म तिथि",
        kind: "date",
        required: true,
      },
      // The one field in this section that stays optional - a profile is
      // discoverable without it, unlike the five fields above.
      {
        key: "height",
        label: "Height / ऊंचाई",
        kind: "select",
        lookup: "height",
      },
      {
        key: "maritalStatus",
        label: "Marital status",
        kind: "chips",
        lookup: "marital_status",
        required: true,
      },
      // Asked for here rather than at sign-up. Sign-up is the worst place for
      // anything that is not strictly needed to create the account - every
      // extra field is a chance to stop before there is one - but a profile
      // still needs it to be reachable, so it is required here.
      {
        key: "mobileNo",
        label: "Mobile number",
        kind: "text",
        keyboard: "phone-pad",
        placeholder: "10-digit number",
        required: true,
      },
    ],
  },

  contact: {
    key: "contact",
    title: "Contact details",
    subtitle: "Only shared with profiles you connect with",
    get: "getContactInfo",
    patch: "updateContactInfo",
    // Mobile number lives on Basic details only, not here too - it is
    // required there now, and the wizard keeps each section's fetched values
    // in its own independent copy for the length of the session. A second
    // "Mobile number" field here would show blank right after being filled
    // in on Basic details, since this section's copy was fetched before that
    // save happened and nothing re-syncs it mid-session.
    fields: [
      {
        key: "whatsappNo",
        label: "WhatsApp number",
        kind: "text",
        keyboard: "phone-pad",
      },
      // State remains a normal picker. City uses the same searchable city
      // picker as birth place, so a member is not restricted to the small
      // dropdown for the selected state and can add a missing city themselves.
      { key: "state", label: "State", kind: "select" },
      { key: "city", label: "City", kind: "select", remote: "city", suggest: 5 },
      { key: "country", label: "Country", kind: "text", placeholder: "India" },
      { key: "presentAddress", label: "Present address", kind: "textarea" },
      { key: "permanentAddress", label: "Permanent address", kind: "textarea" },
    ],
  },

  education: {
    key: "education",
    title: "Education & occupation",
    subtitle: "Update these details to get suitable matches",
    get: "getEducationInfo",
    patch: "updateEducationInfo",
    fields: [
      {
        key: "employedIn",
        label: "Employed in",
        kind: "chips",
        lookup: "employed_in",
      },
      { key: "organization", label: "Organisation", kind: "text" },
      { key: "workCity", label: "Work city", kind: "text" },
      {
        key: "annualIncome",
        label: "Annual income",
        kind: "select",
        lookup: "annual_income",
      },
      { key: "occupationDetails", label: "Role details", kind: "text" },
      {
        key: "profession",
        label: "Profession",
        kind: "select",
        lookup: "profession",
        suggest: 5,
      },
      {
        key: "education",
        label: "Highest degree",
        kind: "select",
        lookup: "education",
        suggest: 5,
      },
      { key: "educationDetails", label: "College / university", kind: "text" },
    ],
  },

  religion: {
    key: "religion",
    title: "Religion & astro",
    subtitle: "Helps families match horoscopes",
    get: "getReligionInfo",
    patch: "updateReligionInfo",
    fields: [
      // Birth place and time lead because they are what the kundali is built
      // from - everything below is describable, these two are load-bearing.
      //
      // Searchable city suggestions make it quick to choose a known location.
      // A typed location can also be kept when it is not in the reference list,
      // so families are not blocked by an incomplete city catalogue.
      {
        key: "placeOfBirth",
        label: "Place of birth (city)",
        kind: "select",
        remote: "city",
      },
      {
        key: "timeOfBirth",
        label: "Time of birth",
        kind: "time",
        placeholder: "Select time",
      },
      { key: "manglik", label: "Manglik", kind: "chips", lookup: "manglik" },
      { key: "gotra", label: "Gotra", kind: "text" },
      {
        key: "motherTongue",
        label: "Mother tongue",
        kind: "select",
        lookup: "mother_tongue",
      },
      { key: "zodiac", label: "Rashi", kind: "select", lookup: "rashi" },
      {
        key: "nakshatra",
        label: "Nakshatra",
        kind: "select",
        lookup: "nakshatra",
      },
    ],
  },

  /**
   * The rest of what used to sit under Basic details.
   *
   * Basic is the first thing anyone fills in, and eleven fields there made the
   * shortest step the longest one. These five are worth having and worth
   * asking for later, so they moved rather than went away - and they still
   * PATCH through the basic endpoint, because they are the same columns.
   */
  other: {
    key: "other",
    title: "Other details",
    subtitle: "Helps families shortlist you",
    get: "getBasicInfo",
    patch: "updateBasicInfo",
    fields: [
      {
        key: "weight",
        label: "Weight (kg)",
        kind: "number",
        keyboard: "numeric",
      },
      {
        key: "profileCreatedBy",
        label: "Profile created by",
        kind: "chips",
        lookup: "profile_created_by",
      },
      {
        key: "complexion",
        label: "Complexion",
        kind: "select",
        lookup: "complexion",
      },
      { key: "diet", label: "Diet", kind: "chips", lookup: "diet" },
      {
        key: "bloodGroup",
        label: "Blood group",
        kind: "select",
        lookup: "blood_group",
      },
      {
        key: "disability",
        label: "Disability",
        kind: "chips",
        lookup: "disability",
      },
    ],
  },

  /**
   * About me, as its own step so it can be the last one.
   *
   * Same two columns and the same endpoint as before - only the grouping
   * changed. Writing prose is the highest-effort thing this form asks for, and
   * putting it last means nobody is staring at an empty textarea before they
   * have filled in a single dropdown.
   */
  about: {
    key: "about",
    title: "About me",
    subtitle: "The part people actually read",
    get: "getFamilyInfo",
    patch: "updateFamilyInfo",
    fields: [
      {
        key: "aboutMyself",
        label: "About me",
        kind: "textarea",
        placeholder: "A few lines about yourself",
      },
      {
        key: "partnerPreferences",
        label: "Partner preferences",
        kind: "textarea",
      },
    ],
  },

  family: {
    key: "family",
    title: "Family details",
    subtitle: "Update these details to get suitable matches",
    get: "getFamilyInfo",
    patch: "updateFamilyInfo",
    fields: [
      { key: "fathersName", label: "Father's name", kind: "text" },
      {
        key: "fathersOccupation",
        label: "Father's occupation",
        kind: "select",
        lookup: "profession",
        suggest: 5,
      },
      {
        key: "fathersContactNo",
        label: "Father's contact",
        kind: "text",
        keyboard: "phone-pad",
      },
      { key: "mothersName", label: "Mother's name", kind: "text" },
      {
        key: "mothersOccupation",
        label: "Mother's occupation",
        kind: "select",
        lookup: "profession",
        suggest: 5,
      },
      {
        key: "marriedBrothers",
        label: "Married brothers",
        kind: "number",
        keyboard: "numeric",
      },
      {
        key: "unmarriedBrothers",
        label: "Unmarried brothers",
        kind: "number",
        keyboard: "numeric",
      },
      {
        key: "marriedSisters",
        label: "Married sisters",
        kind: "number",
        keyboard: "numeric",
      },
      {
        key: "unmarriedSisters",
        label: "Unmarried sisters",
        kind: "number",
        keyboard: "numeric",
      },
      {
        key: "maternalUnclesName",
        label: "Maternal uncle's name (Mama)",
        kind: "text",
      },
      {
        key: "maternalUnclesGotra",
        label: "Maternal uncle's gotra",
        kind: "text",
      },
      {
        key: "houseStatus",
        label: "House",
        kind: "chips",
        lookup: "house_status",
      },
      { key: "carStatus", label: "Car", kind: "chips", lookup: "car_status" },
    ],
  },
};

/**
 * Section order for the profile screen's cards.
 *
 * The setup wizard uses its own order - see STEPS in profile-setup.tsx - since
 * it has an extra photos step and deliberately ends on About me.
 */
export const SECTION_ORDER = [
  "basic",
  "other",
  "education",
  "religion",
  "family",
  "contact",
  "about",
] as const;

/**
 * Builds the PATCH body for a section.
 *
 * Only that section's keys are sent. Posting the whole form state would either
 * be rejected or, worse, silently overwrite fields the user never opened -
 * the split endpoints exist precisely so each save is narrow.
 *
 * Numbers are coerced because TextInput always hands back a string, and an
 * empty one has to become null rather than 0.
 */
export function buildPayload(spec: SectionSpec, values: Record<string, any>) {
  const payload: Record<string, any> = {};

  for (const field of spec.fields) {
    const value = values[field.key];
    if (value === undefined) continue;

    if (field.kind === "number") {
      payload[field.key] =
        value === "" || value === null ? null : Number(value);
    } else if (field.kind === "date") {
      if (value === "" || value === null) {
        payload[field.key] = null;
      } else {
        const s = String(value).trim();
        payload[field.key] = s.includes("T") ? s : `${s}T00:00:00`;
      }
    } else {
      payload[field.key] = value;
    }
  }

  return payload;
}

/**
 * The first required field this section is missing, or null when it is complete.
 *
 * Enforced in the app rather than by the server, deliberately: the endpoints
 * PATCH one field at a time and treat null as "leave alone", which is what lets
 * every other screen save a partial section. Making the name non-null at that
 * layer would break those. This is a rule about one form, so it lives with the
 * form.
 */
export function firstMissingRequired(
  spec: SectionSpec,
  values: Record<string, any>,
): FieldSpec | null {
  for (const field of spec.fields) {
    if (!field.required) continue;
    const v = values[field.key];
    if (v === null || v === undefined || String(v).trim() === "") return field;
  }
  return null;
}

/**
 * Every required field this section is missing, keyed by field.key.
 *
 * Used to mark every empty required field red at once instead of blocking Save
 * on an alert about only the first one - so filling one and pressing Save does
 * not just surface the next one in a loop.
 */
export function missingRequiredKeys(
  spec: SectionSpec,
  values: Record<string, any>,
): string[] {
  return spec.fields
    .filter((field) => field.required)
    .filter((field) => {
      const v = values[field.key];
      return v === null || v === undefined || String(v).trim() === "";
    })
    .map((field) => field.key);
}
