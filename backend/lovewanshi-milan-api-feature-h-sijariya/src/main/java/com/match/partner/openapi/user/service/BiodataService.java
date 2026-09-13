package com.match.partner.openapi.user.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.match.partner.common.Utils.CommonUtils;
import com.match.partner.common.configuration.ClientException;
import com.match.partner.common.service.S3ServiceInterface;
import com.match.partner.openapi.attachment.model.entity.dao.AttachmentDao;
import com.match.partner.openapi.attachment.repository.AttachmentRepository;
import com.match.partner.openapi.reference.model.dao.LookupOption;
import com.match.partner.openapi.reference.repository.LookupOptionRepository;
import com.match.partner.openapi.user.model.dao.Kundali;
import com.match.partner.openapi.user.model.dao.UserProfile;
import com.match.partner.openapi.user.repository.KundaliRepository;
import com.match.partner.openapi.user.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

/**
 * The shareable biodata sheet - the single page families actually exchange.
 *
 * Rendered as a print-styled HTML page rather than a PDF built here, and the
 * caller turns it into a PDF with its own renderer (the browser's print engine
 * on web, the OS WebKit renderer in the app). Two reasons: this backend runs on
 * a small instance where a PDF layout engine per request is real CPU, and the
 * sheet carries Devanagari, layered gold borders and an inline SVG chart -
 * things a browser already renders correctly and a server-side PDF library
 * mostly does not.
 *
 * Astrological values are read from the stored chart, never recomputed here.
 * The chart is generated once per set of birth details (see KundaliService);
 * a second implementation of the same arithmetic is a second thing to get
 * subtly wrong.
 */
@Service
@RequiredArgsConstructor
public class BiodataService {

    private static final DateTimeFormatter LONG_DATE = DateTimeFormatter.ofPattern("d MMMM yyyy");
    private static final DateTimeFormatter SHORT_DATE = DateTimeFormatter.ofPattern("d MMM yyyy");

    /**
     * Ashtakoota attribute tables, indexed exactly as the kundali_match Lambda
     * indexes them - nakshatra 0-26, rashi 0-11. Duplicated from there on
     * purpose: this sheet only ever displays them, and reaching across to a
     * Lambda to print one word per row would put a network call on a page
     * render.
     */
    private static final String[] GANA = {
            "Deva", "Manushya", "Rakshasa", "Manushya", "Deva", "Manushya",
            "Deva", "Deva", "Rakshasa", "Rakshasa", "Manushya", "Manushya",
            "Deva", "Rakshasa", "Deva", "Rakshasa", "Deva", "Rakshasa",
            "Rakshasa", "Manushya", "Manushya", "Deva", "Rakshasa", "Rakshasa",
            "Manushya", "Manushya", "Deva"};

    private static final String[] NADI = {
            "Aadi", "Madhya", "Antya", "Aadi", "Madhya", "Antya",
            "Aadi", "Madhya", "Antya", "Antya", "Madhya", "Aadi",
            "Antya", "Madhya", "Aadi", "Aadi", "Madhya", "Antya",
            "Antya", "Madhya", "Aadi", "Antya", "Madhya", "Aadi",
            "Aadi", "Madhya", "Antya"};

    private static final String[] YONI = {
            "Horse", "Elephant", "Sheep", "Serpent", "Serpent", "Dog",
            "Cat", "Sheep", "Cat", "Rat", "Rat", "Cow",
            "Buffalo", "Tiger", "Buffalo", "Tiger", "Deer", "Deer",
            "Dog", "Monkey", "Mongoose", "Monkey", "Lion", "Horse",
            "Lion", "Cow", "Elephant"};

    private static final String[] RASHI_LORDS = {
            "Mangal (Mars)", "Shukra (Venus)", "Budh (Mercury)", "Chandra (Moon)",
            "Surya (Sun)", "Budh (Mercury)", "Shukra (Venus)", "Mangal (Mars)",
            "Guru (Jupiter)", "Shani (Saturn)", "Shani (Saturn)", "Guru (Jupiter)"};

    private final UserProfileRepository userProfileRepository;
    private final KundaliRepository kundaliRepository;
    private final AttachmentRepository attachmentRepository;
    private final S3ServiceInterface s3Service;
    private final CommonUtils commonUtils;
    private final LookupOptionRepository lookupOptionRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String renderForUser(String userName) {
        UserProfile profile = userProfileRepository.findByEmail(userName)
                .filter(p -> p.getDeletedAt() == null)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "Profile not found"));
        return render(profile);
    }

    private String render(UserProfile p) {
        Kundali kundali = kundaliRepository.findById(p.getId()).orElse(null);
        JsonNode chart = readChart(kundali);

        StringBuilder html = new StringBuilder(20000);
        html.append("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">")
            .append("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">")
            .append("<title>Biodata - ").append(esc(p.getName())).append("</title>")
            .append(styles())
            .append("</head><body><div class=\"sheet\">");

        html.append(corners());
        html.append(masthead(p, chart));
        html.append("<div class=\"cols\">")
            .append(personalDetails(p, kundali, chart))
            .append("<div class=\"divider\">❖<br>❖<br>❖</div>")
            .append("<div class=\"col-right\">")
            .append(familyDetails(p))
            .append(aboutMe(p))
            .append("</div>")
            .append("</div>");
        html.append(kundaliSection(kundali, chart));
        html.append(footer(p));

        html.append("</div></body></html>");
        return html.toString();
    }

    private JsonNode readChart(Kundali kundali) {
        if (kundali == null || kundali.getChart() == null) {
            return null;
        }
        try {
            return objectMapper.readTree(kundali.getChart());
        } catch (Exception e) {
            return null;
        }
    }

    // -------------------------------------------------------------- masthead

    /**
     * Photo, title block and birth facts on one row.
     *
     * Three columns rather than stacked sections, which is what the printed
     * sheet this is modelled on does - stacking them cost about 60mm of height
     * and pushed the page over onto a second sheet.
     */
    private String masthead(UserProfile p, JsonNode chart) {
        String photo = primaryPhotoUrl(p);

        StringBuilder sb = new StringBuilder();
        sb.append("<div class=\"invoke\">|| श्री गणेशाय "
                + "नमः ||</div>");

        sb.append("<div class=\"masthead\">");

        sb.append("<div class=\"photo-frame\">");
        if (photo != null) {
            sb.append("<img class=\"photo\" src=\"").append(esc(photo)).append("\" alt=\"\">");
        } else {
            sb.append("<div class=\"photo photo-empty\"></div>");
        }
        sb.append("</div>");

        sb.append("<div class=\"masthead-mid\">")
          .append("<div class=\"ganesh\">").append(ganeshIcon()).append("</div>")
          .append("<h1 class=\"title\">BIODATA</h1>")
          .append("<div class=\"rule\"><span></span>❖<span></span></div>")
          .append("<div class=\"subtitle\">Looking for a Life Partner</div>")
          .append("<div class=\"tagline\">")
          .append("<div>संस्कारों से "
                + "जुड़े रिश्ते,</div>")
          .append("<div>विश्वास से बनता "
                + "जीवन।</div>")
          .append("</div>")
          .append("</div>");

        sb.append("<div class=\"facts\">");
        sb.append(fact(iconCalendar(), "DOB", p.getDateOfBirth() == null ? null
                : p.getDateOfBirth().format(SHORT_DATE)));
        sb.append(fact(iconClock(), "Time", trimSeconds(p.getTimeOfBirth())));
        sb.append(fact(iconPin(), "Place", p.getPlaceOfBirth()));
        sb.append(fact(iconHeight(), "Height", formatHeight(p.getHeight())));
        sb.append(fact(iconStar(), "Manglik", manglikLabel(p, chart)));
        sb.append(fact(iconBlood(), "Blood Group", resolveLookup("blood_group", p.getBloodGroup())));
        sb.append("</div>");

        sb.append("</div>");
        return sb.toString();
    }

    /**
     * One birth-fact row. A grid cell per part rather than inline spans, so
     * the icons, the labels and the values each line up down their own
     * column - "Blood Group:" is twice the width of "DOB:", and flowing them
     * inline left the values in a ragged edge.
     */
    private String fact(String icon, String label, String value) {
        if (blank(value)) {
            return "";
        }
        return "<span class=\"fact-icon\">" + icon + "</span>"
                + "<span class=\"fact-label\">" + esc(label) + ":</span>"
                + "<span class=\"fact-value\">" + esc(value) + "</span>";
    }

    // --------------------------------------------------------------- columns

    private String personalDetails(UserProfile p, Kundali kundali, JsonNode chart) {
        StringBuilder rows = new StringBuilder();
        rows.append(row("Name", p.getName()));
        rows.append(row("Date of Birth", p.getDateOfBirth() == null ? null
                : p.getDateOfBirth().format(LONG_DATE)));
        rows.append(row("Time of Birth", trimSeconds(p.getTimeOfBirth())));
        rows.append(row("Place of Birth", p.getPlaceOfBirth()));
        rows.append(row("Rashi (Moon Sign)", rashiLabel(kundali)));
        rows.append(row("Nakshatra", kundali == null ? null : kundali.getNakshatra()));
        rows.append(row("Lagna", lagnaLabel(chart)));
        rows.append(row("Height", formatHeight(p.getHeight())));
        rows.append(row("Complexion", resolveLookup("complexion", p.getComplexion())));
        rows.append(row("Gotra", p.getGotra()));
        rows.append(row("Mother Tongue", resolveLookup("mother_tongue", p.getMotherTongue())));
        rows.append(row("Diet", resolveLookup("diet", p.getDiet())));
        rows.append(row("Education", resolveLookup("education", p.getEducation())));
        rows.append(row("Profession", resolveLookup("profession", p.getProfession())));
        rows.append(row("Company", p.getOrganization()));
        rows.append(row("Annual Income", resolveLookup("annual_income", p.getAnnualIncome())));
        rows.append(row("Current Location", currentLocation(p)));

        return "<div class=\"col-left\">"
                + section("PERSONAL DETAILS", iconPerson())
                + "<table class=\"kv\">" + rows + "</table>"
                + "<div class=\"flourish\">❀</div>"
                + "</div>";
    }

    private String familyDetails(UserProfile p) {
        StringBuilder rows = new StringBuilder();
        rows.append(row("Father's Name", p.getFathersName()));
        rows.append(row("Father's Occupation", resolveLookup("father_occupation", p.getFathersOccupation())));
        rows.append(row("Mother's Name", p.getMothersName()));
        rows.append(row("Mother's Occupation", resolveLookup("mother_occupation", p.getMothersOccupation())));
        rows.append(row("Siblings", siblings(p)));
        rows.append(row("Maternal Uncle", p.getMaternalUnclesName()));
        rows.append(row("Maternal Uncle's Gotra", p.getMaternalUnclesGotra()));
        rows.append(row("Family Residence", familyResidence(p)));

        return section("FAMILY DETAILS", iconFamily())
                + "<table class=\"kv\">" + rows + "</table>";
    }

    private String aboutMe(UserProfile p) {
        if (blank(p.getAboutMyself())) {
            return "";
        }
        // Ornaments point inward at the heading from both sides. They were
        // both pointing right, which read as an arrow leading somewhere
        // rather than as a symmetric flourish.
        return "<div class=\"about\">"
                + "<div class=\"about-title\">"
                + "<span class=\"about-orn\">&#10148;</span>"
                + "<span>About Me</span>"
                + "<span class=\"about-orn flip\">&#10148;</span>"
                + "</div>"
                + "<p>" + esc(p.getAboutMyself()) + "</p>"
                + "</div>";
    }

    // --------------------------------------------------------------- kundali

    private String kundaliSection(Kundali kundali, JsonNode chart) {
        // No chart yet. The section still appears, saying so plainly, rather
        // than vanishing - a biodata that silently drops its kundali looks
        // like a sheet that was never finished, and the member has no way to
        // tell that anything is missing or what to do about it.
        if (kundali == null && chart == null) {
            return band()
                    + "<div class=\"kundali-none\">"
                    + "<div class=\"kundali-none-title\">Kundali not generated yet</div>"
                    + "<p>Add your date, time and place of birth to your profile and generate "
                    + "your kundali in the app - it will then appear here automatically, with "
                    + "the full north Indian chart.</p>"
                    + "</div>";
        }

        StringBuilder rows = new StringBuilder();
        rows.append(kundaliRow(iconMoon(), "Rashi (Moon Sign)", rashiLabel(kundali)));
        rows.append(kundaliRow(iconStar(), "Nakshatra", kundali == null ? null : kundali.getNakshatra()));
        rows.append(kundaliRow(iconSun(), "Lagna (Ascendant)", lagnaLabel(chart)));
        rows.append(kundaliRow(iconFlame(), "Charan (Pada)", chart == null ? null
                : text(chart.path("nakshatra_pada"))));
        rows.append(kundaliRow(iconLotus(), "Manglik Dosha", kundali == null ? null
                : (Boolean.TRUE.equals(kundali.getManglik()) ? "Yes" : "No")));
        rows.append(kundaliRow(iconLotus(), "Nadi", lookup(NADI, kundali == null ? null : kundali.getNakshatraIndex())));
        rows.append(kundaliRow(iconPerson(), "Gana", lookup(GANA, kundali == null ? null : kundali.getNakshatraIndex())));
        rows.append(kundaliRow(iconStar(), "Yoni", lookup(YONI, kundali == null ? null : kundali.getNakshatraIndex())));
        rows.append(kundaliRow(iconSun(), "Rashi Lord", lookup(RASHI_LORDS, kundali == null ? null : kundali.getRashiIndex())));

        String svg = chart == null ? null : text(chart.path("svg"));

        return band()
                + "<div class=\"kundali\">"
                + "<table class=\"kundali-table\">" + rows + "</table>"
                + "<div class=\"divider\">❖<br>❖</div>"
                + "<div class=\"chart-wrap\">"
                + "<div class=\"chart-title\">KUNDALI <span>(NORTH INDIAN CHART)</span></div>"
                + (blank(svg) ? "<div class=\"chart-missing\">Chart not generated yet</div>"
                              : "<div class=\"chart\">" + svg + "</div>")
                + "</div>"
                + "</div>";
    }

    /** The KUNDALI DETAILS band, with a gold rule running out to each margin. */
    private String band() {
        return "<div class=\"band-wrap\"><span class=\"band-rule\"></span>"
                + "<div class=\"kundali-band\">KUNDALI DETAILS</div>"
                + "<span class=\"band-rule\"></span></div>";
    }

    private String kundaliRow(String icon, String label, String value) {
        if (blank(value)) {
            return "";
        }
        return "<tr><td class=\"ki\">" + icon + "</td>"
                + "<td class=\"kl\">" + esc(label) + "</td>"
                + "<td class=\"kc\">:</td>"
                + "<td class=\"kv2\">" + esc(value) + "</td></tr>";
    }

    private String footer(UserProfile p) {
        String wanted = blank(p.getPartnerPreferences())
                ? "We are looking for a cultured, well educated and family oriented life partner."
                : p.getPartnerPreferences();
        return "<div class=\"footer\">❖ " + esc(wanted) + " ❖</div>"
                + "<div class=\"footer-id\">Profile ID: "
                + esc(commonUtils.convertToJMFormat(p.getId()).replaceFirst("^JM", "GM"))
                + "</div>";
    }

    // ----------------------------------------------------------- value logic

    /**
     * Manglik as the sheet should state it: the computed chart is the
     * authority, and the self-entered profile field is only a fallback for
     * someone who has never generated a kundali.
     */
    private String manglikLabel(UserProfile p, JsonNode chart) {
        if (chart != null && chart.has("manglik")) {
            return chart.path("manglik").asBoolean(false) ? "Yes" : "No";
        }
        return resolveLookup("manglik", p.getManglik());
    }

    private String rashiLabel(Kundali k) {
        if (k == null || blank(k.getRashi())) {
            return null;
        }
        return k.getRashi();
    }

    private String lagnaLabel(JsonNode chart) {
        if (chart == null) {
            return null;
        }
        JsonNode asc = chart.path("ascendant");
        String rashi = text(asc.path("rashi"));
        String english = text(asc.path("rashi_en"));
        if (blank(rashi)) {
            return null;
        }
        return blank(english) ? rashi : rashi + " (" + english + ")";
    }

    private String siblings(UserProfile p) {
        int brothers = zero(p.getNoOfMarriedBrothers()) + zero(p.getNoOfUnmarriedBrothers());
        int sisters = zero(p.getNoOfMarriedSisters()) + zero(p.getNoOfUnmarriedSisters());
        if (brothers == 0 && sisters == 0) {
            return null;
        }
        StringBuilder sb = new StringBuilder();
        if (brothers > 0) {
            sb.append(brothers).append(brothers == 1 ? " Brother" : " Brothers");
        }
        if (sisters > 0) {
            if (sb.length() > 0) {
                sb.append(", ");
            }
            sb.append(sisters).append(sisters == 1 ? " Sister" : " Sisters");
        }
        return sb.toString();
    }

    private String currentLocation(UserProfile p) {
        return joinNonBlank(", ", firstNonBlank(p.getWorkCity(), p.getCity()), p.getState());
    }

    private String familyResidence(UserProfile p) {
        return joinNonBlank(", ", p.getCity(), p.getState());
    }

    private String primaryPhotoUrl(UserProfile p) {
        List<AttachmentDao> attachments = attachmentRepository.findByUserId(p.getId());
        if (attachments == null || attachments.isEmpty()) {
            return null;
        }
        AttachmentDao primary = attachments.stream()
                .filter(a -> Boolean.TRUE.equals(a.getIsPrimary()))
                .findFirst()
                .orElse(attachments.get(0));
        return s3Service.generatePresignedUrl(primary.getName());
    }

    private String lookup(String[] table, Integer index) {
        if (index == null || index < 0 || index >= table.length) {
            return null;
        }
        return table[index];
    }

    // ---------------------------------------------------------------- output

    private String section(String title, String icon) {
        return "<div class=\"section\"><span class=\"section-icon\">" + icon + "</span>"
                + esc(title) + "</div>";
    }

    private String row(String label, String value) {
        if (blank(value)) {
            return "";
        }
        return "<tr><td class=\"k\">" + esc(label) + "</td>"
                + "<td class=\"c\">:</td>"
                + "<td class=\"v\">" + esc(value) + "</td></tr>";
    }

    // ----------------------------------------------------------- small utils

    private static boolean blank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private static int zero(Integer i) {
        return i == null ? 0 : i;
    }

    private static String text(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        return node.asText(null);
    }

    private static String trimSeconds(String time) {
        if (blank(time)) {
            return null;
        }
        return time.length() >= 5 ? time.substring(0, 5) : time;
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (!blank(v)) {
                return v;
            }
        }
        return null;
    }

    private static String joinNonBlank(String separator, String... values) {
        StringBuilder sb = new StringBuilder();
        for (String v : values) {
            if (blank(v)) {
                continue;
            }
            if (sb.length() > 0) {
                sb.append(separator);
            }
            sb.append(v.trim());
        }
        return sb.length() == 0 ? null : sb.toString();
    }

    private String formatHeight(String raw) {
        if (blank(raw)) {
            return null;
        }
        String trimmed = raw.trim();
        if (lookupOptionRepository != null) {
            try {
                Optional<LookupOption> opt = lookupOptionRepository
                        .findByCategoryAndActiveTrueOrderBySortOrderAsc("height")
                        .stream()
                        .filter(o -> o.getCode().equalsIgnoreCase(trimmed))
                        .findFirst();
                if (opt.isPresent()) {
                    return opt.get().getLabel();
                }
            } catch (Exception ignored) {
            }
        }
        if (trimmed.toUpperCase().startsWith("H_")) {
            try {
                int inches = Integer.parseInt(trimmed.substring(2).trim());
                int feet = inches / 12;
                int remInches = inches % 12;
                long cm = Math.round(inches * 2.54);
                return String.format("%d' %d\" (%d cm)", feet, remInches, cm);
            } catch (NumberFormatException ignored) {
            }
        }
        return trimmed;
    }

    private String resolveLookup(String category, String code) {
        if (blank(code)) {
            return null;
        }
        String trimmed = code.trim();
        if ("height".equalsIgnoreCase(category)) {
            return formatHeight(trimmed);
        }
        if (lookupOptionRepository != null) {
            try {
                Optional<LookupOption> opt = lookupOptionRepository
                        .findByCategoryAndActiveTrueOrderBySortOrderAsc(category)
                        .stream()
                        .filter(o -> o.getCode().equalsIgnoreCase(trimmed))
                        .findFirst();
                if (opt.isPresent()) {
                    return opt.get().getLabel();
                }
            } catch (Exception ignored) {
            }
        }
        return formatFallbackCode(trimmed);
    }

    private static String formatFallbackCode(String code) {
        if (blank(code)) {
            return null;
        }
        String trimmed = code.trim();
        if (trimmed.contains("_")) {
            String[] parts = trimmed.split("_");
            StringBuilder sb = new StringBuilder();
            for (String part : parts) {
                if (!part.isEmpty()) {
                    if (sb.length() > 0) {
                        sb.append(" ");
                    }
                    sb.append(Character.toUpperCase(part.charAt(0)))
                      .append(part.substring(1).toLowerCase());
                }
            }
            return sb.toString();
        }
        if (trimmed.length() > 1 && trimmed.equals(trimmed.toUpperCase())) {
            return Character.toUpperCase(trimmed.charAt(0)) + trimmed.substring(1).toLowerCase();
        }
        return trimmed;
    }

    /**
     * The stored chart's SVG is the one field deliberately not escaped - it is
     * generated by our own Lambda, not user input. Everything else on this
     * page goes through here, because a biodata is full of free text a member
     * typed.
     */
    private static String esc(String s) {
        if (s == null) {
            return "";
        }
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    // ------------------------------------------------------------- chrome

    private String corners() {
        String c = "<svg viewBox=\"0 0 120 120\" fill=\"none\">"
                + "<path d=\"M4 116V40C4 20 20 4 40 4h76\" stroke=\"#C9A227\" stroke-width=\"2\"/>"
                + "<path d=\"M12 116V44C12 26 26 12 44 12h72\" stroke=\"#C9A227\" stroke-width=\"1\" opacity=\".7\"/>"
                + "<circle cx=\"30\" cy=\"30\" r=\"5\" fill=\"#C9A227\" opacity=\".55\"/>"
                + "<circle cx=\"48\" cy=\"20\" r=\"3\" fill=\"#C9A227\" opacity=\".4\"/>"
                + "<circle cx=\"20\" cy=\"48\" r=\"3\" fill=\"#C9A227\" opacity=\".4\"/>"
                + "<path d=\"M62 8c8 0 14 6 14 12M8 62c0-8 6-14 12-14\" stroke=\"#C9A227\" stroke-width=\"1\" opacity=\".6\"/>"
                + "</svg>";
        return "<div class=\"corner tl\">" + c + "</div>"
                + "<div class=\"corner tr\">" + c + "</div>"
                + "<div class=\"corner bl\">" + c + "</div>"
                + "<div class=\"corner br\">" + c + "</div>";
    }

    /**
     * Ganesha, line-art, matching the printed sheet this is modelled on:
     * crown point, domed head, the two broad ears, and the trunk curling to
     * the left over a suggestion of the body.
     */
    private String ganeshIcon() {
        return "<svg viewBox=\"0 0 100 110\" fill=\"none\" stroke=\"#8B1A1A\" stroke-width=\"3\" "
                + "stroke-linecap=\"round\" stroke-linejoin=\"round\">"
                // crown / tuft
                + "<path d=\"M50 6c-2.5 3.5-2.5 7 0 10.5 2.5-3.5 2.5-7 0-10.5z\"/>"
                + "<path d=\"M50 16.5c-9 0-16 7-16 15.5 0 4 1.5 7.5 4 10\"/>"
                + "<path d=\"M50 16.5c9 0 16 7 16 15.5 0 4-1.5 7.5-4 10\"/>"
                // ears, the widest part of the silhouette
                + "<path d=\"M34 27c-9-2-16 3-17.5 11-1.5 8 3.5 15 12 16.5 4 .7 7-.5 9-3\"/>"
                + "<path d=\"M66 27c9-2 16 3 17.5 11 1.5 8-3.5 15-12 16.5-4 .7-7-.5-9-3\"/>"
                // eyes
                + "<path d=\"M42 36.5h5M53 36.5h5\"/>"
                // trunk, curling left and back in
                + "<path d=\"M50 42c0 7-.5 12-3 17-2.5 5-8 7-12 4.5-3.5-2-3.5-7 0-8.5 2.5-1 4.5.5 5 2.5\"/>"
                // tusks
                + "<path d=\"M40 47c-2.5 1.5-4 3-4.5 5M60 47c2.5 1.5 4 3 4.5 5\"/>"
                // shoulders / seated body
                + "<path d=\"M28 76c4-6 12-9 22-9s18 3 22 9\"/>"
                + "<path d=\"M22 92c6-6 16-9 28-9s22 3 28 9\"/>"
                + "<path d=\"M50 6v-2\" stroke=\"#C9A227\"/>"
                + "</svg>";
    }

    private String iconCalendar() {
        return "<svg viewBox=\"0 0 24 24\" fill=\"none\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\" "
                + "stroke=\"#8B1A1A\" stroke-width=\"1.8\"/><path d=\"M3 10h18M8 3v4M16 3v4\" stroke=\"#8B1A1A\" "
                + "stroke-width=\"1.8\"/></svg>";
    }

    private String iconClock() {
        return "<svg viewBox=\"0 0 24 24\" fill=\"none\"><circle cx=\"12\" cy=\"12\" r=\"9\" stroke=\"#8B1A1A\" "
                + "stroke-width=\"1.8\"/><path d=\"M12 7v5l3 2\" stroke=\"#8B1A1A\" stroke-width=\"1.8\"/></svg>";
    }

    private String iconPin() {
        return "<svg viewBox=\"0 0 24 24\" fill=\"none\"><path d=\"M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z\" "
                + "stroke=\"#8B1A1A\" stroke-width=\"1.8\"/><circle cx=\"12\" cy=\"10\" r=\"2.5\" stroke=\"#8B1A1A\" "
                + "stroke-width=\"1.8\"/></svg>";
    }

    private String iconHeight() {
        return "<svg viewBox=\"0 0 24 24\" fill=\"none\"><path d=\"M12 3v18M8 6l4-3 4 3M8 18l4 3 4-3\" "
                + "stroke=\"#8B1A1A\" stroke-width=\"1.8\"/></svg>";
    }

    private String iconStar() {
        return "<svg viewBox=\"0 0 24 24\" fill=\"none\"><path d=\"M12 3l2.6 5.6 6.1.8-4.5 4.2 1.2 6L12 16.8 "
                + "6.6 19.6l1.2-6L3.3 9.4l6.1-.8L12 3z\" stroke=\"#8B1A1A\" stroke-width=\"1.6\"/></svg>";
    }

    private String iconBlood() {
        return "<svg viewBox=\"0 0 24 24\" fill=\"none\"><path d=\"M12 3s6 7 6 11a6 6 0 11-12 0c0-4 6-11 6-11z\" "
                + "fill=\"#8B1A1A\" opacity=\".85\"/></svg>";
    }

    private String iconPerson() {
        return "<svg viewBox=\"0 0 24 24\" fill=\"none\"><circle cx=\"12\" cy=\"8\" r=\"4\" fill=\"#fff\"/>"
                + "<path d=\"M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7\" fill=\"#fff\"/></svg>";
    }

    private String iconFamily() {
        return "<svg viewBox=\"0 0 24 24\" fill=\"none\"><circle cx=\"8\" cy=\"9\" r=\"3\" fill=\"#fff\"/>"
                + "<circle cx=\"17\" cy=\"9\" r=\"2.5\" fill=\"#fff\"/>"
                + "<path d=\"M2 20c0-3.3 2.7-5 6-5s6 1.7 6 5M14.5 20c0-2.8 1.9-4.2 4.5-4.2s3 1.4 3 4.2\" "
                + "fill=\"#fff\"/></svg>";
    }

    private String iconMoon() {
        return "<svg viewBox=\"0 0 24 24\" fill=\"none\"><path d=\"M20 14a8 8 0 01-10-10 8 8 0 1010 10z\" "
                + "stroke=\"#8B1A1A\" stroke-width=\"1.7\"/></svg>";
    }

    private String iconSun() {
        return "<svg viewBox=\"0 0 24 24\" fill=\"none\"><circle cx=\"12\" cy=\"12\" r=\"4\" stroke=\"#8B1A1A\" "
                + "stroke-width=\"1.7\"/><path d=\"M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 "
                + "5l-1.5 1.5M6.5 17.5L5 19\" stroke=\"#8B1A1A\" stroke-width=\"1.7\"/></svg>";
    }

    private String iconFlame() {
        return "<svg viewBox=\"0 0 24 24\" fill=\"none\"><path d=\"M12 3c3 4 6 6 6 10a6 6 0 11-12 0c0-2 1-3 2-4 "
                + "1 2 2 2 3 1 0-3 1-5 1-7z\" stroke=\"#8B1A1A\" stroke-width=\"1.6\"/></svg>";
    }

    private String iconLotus() {
        return "<svg viewBox=\"0 0 24 24\" fill=\"none\"><path d=\"M12 4c2 3 3 5 3 8 0 2-1 4-3 4s-3-2-3-4c0-3 1-5 "
                + "3-8zM5 10c2 1 3 3 3 6M19 10c-2 1-3 3-3 6M3 16c3 3 6 4 9 4s6-1 9-4\" stroke=\"#8B1A1A\" "
                + "stroke-width=\"1.5\"/></svg>";
    }

    private String styles() {
        return "<style>"
                + "@page{size:A4;margin:0}"
                + "*{box-sizing:border-box}"
                + "body{margin:0;background:#e9e2d4;font-family:Georgia,'Times New Roman',serif;color:#2b2118;"
                + "-webkit-print-color-adjust:exact;print-color-adjust:exact}"
                + ".sheet{position:relative;width:210mm;height:297mm;margin:0 auto;padding:9mm 11mm 7mm;"
                + "background:linear-gradient(#fffdf6,#fdf6e6);border:3px double #C9A227;overflow:hidden;"
                + "display:flex;flex-direction:column}"
                // A box exactly as tall as the page it prints on does not fit:
                // sub-pixel rounding in the print pipeline pushes it over by a
                // fraction, and the browser answers by clipping the bottom (or
                // emitting a second, near-empty page). 292mm leaves that
                // rounding somewhere to go, which is why the footer and the
                // kundali block stopped disappearing off the bottom edge.
                + "@media print{body{background:#fff}"
                + ".sheet{height:292mm;margin:0;border:none;box-shadow:none;page-break-after:avoid;"
                + "page-break-inside:avoid}}"

                + ".corner{position:absolute;width:30mm;height:30mm;opacity:.9;pointer-events:none}"
                + ".corner svg{width:100%;height:100%}"
                + ".tl{top:3mm;left:3mm}"
                + ".tr{top:3mm;right:3mm;transform:scaleX(-1)}"
                + ".bl{bottom:3mm;left:3mm;transform:scaleY(-1)}"
                + ".br{bottom:3mm;right:3mm;transform:scale(-1,-1)}"

                + ".invoke{text-align:center;color:#8B1A1A;font-size:9.5pt;letter-spacing:.5px;margin-bottom:1mm}"

                + ".masthead{display:flex;gap:4mm;align-items:flex-start;margin-bottom:4mm}"
                + ".masthead-mid{flex:1;min-width:0;text-align:center}"
                + ".ganesh{display:flex;justify-content:center;margin-bottom:1mm}"
                + ".ganesh svg{width:13mm;height:14mm}"
                + ".title{font-size:27pt;letter-spacing:5px;color:#7B1113;margin:0;font-weight:700;line-height:1}"
                + ".rule{display:flex;align-items:center;justify-content:center;gap:2mm;color:#C9A227;"
                + "margin:1.5mm 0;font-size:8pt}"
                + ".rule span{display:block;width:18mm;height:1px;background:#C9A227}"
                + ".subtitle{color:#8B1A1A;font-size:9.5pt;margin-bottom:2.5mm}"
                + ".tagline{margin:0 auto;max-width:64mm;color:#7B1113;font-size:9.5pt;line-height:1.55;"
                + "border:1px solid #C9A227;padding:2mm 3mm;background:#fffdf4}"

                + ".photo-frame{width:36mm;flex:0 0 36mm;border:1.5px solid #C9A227;"
                + "border-radius:18mm 18mm 2mm 2mm;padding:1.2mm;background:#fffdf4}"
                + ".photo{width:100%;height:44mm;object-fit:cover;border-radius:17mm 17mm 1.5mm 1.5mm;display:block}"
                + ".photo-empty{background:#efe7d6}"
                + ".facts{flex:0 0 54mm;display:grid;grid-template-columns:4.2mm auto 1fr;"
                + "align-items:center;gap:2.2mm 1.8mm;padding-top:1mm;"
                + "border-left:1px solid #e3d7b8;padding-left:4mm;font-size:9pt}"
                + ".fact-icon{display:inline-flex;width:4.2mm;height:4.2mm}"
                + ".fact-icon svg{width:100%;height:100%}"
                + ".fact-label{color:#2b2118;white-space:nowrap}"
                + ".fact-value{color:#2b2118}"

                + ".divider{flex:0 0 4mm;text-align:center;color:#C9A227;font-size:7pt;line-height:2.4;"
                + "padding-top:8mm;opacity:.8}"

                + ".cols{display:flex;gap:3mm;align-items:flex-start}"
                + ".col-left{flex:1;min-width:0}"
                + ".col-right{flex:1;min-width:0}"
                + ".section{display:flex;align-items:center;justify-content:center;gap:2mm;background:#8B1A1A;"
                + "color:#fff;font-size:9.5pt;letter-spacing:1.4px;padding:1.4mm 4mm;border-radius:1.5mm;"
                + "margin-bottom:2.5mm;font-weight:700}"
                + ".section-icon{display:inline-flex;width:4mm;height:4mm}"
                + ".section-icon svg{width:100%;height:100%}"

                + ".kv{width:100%;border-collapse:collapse;font-size:9pt}"
                + ".kv td{padding:.85mm 0;vertical-align:top;line-height:1.3}"
                + ".kv .k{width:42%;color:#2b2118}"
                + ".kv .c{width:3.5mm;color:#8a7f6d}"
                + ".kv .v{color:#2b2118}"
                + ".flourish{text-align:center;color:#C9A227;margin-top:2mm;font-size:10pt}"

                // Sits clear of the family table above it rather than butting
                // straight up against the last row - the right column is the
                // shorter of the two, so the gap costs no page height.
                + ".about{margin-top:7mm;border:1px solid #C9A227;background:#fffdf4;padding:2.4mm 3.5mm 3mm}"
                + ".about-title{display:flex;align-items:center;justify-content:center;gap:2.5mm;"
                + "color:#7B1113;font-size:9.5pt;font-weight:700;margin-bottom:1.6mm}"
                + ".about-orn{color:#C9A227;font-size:7pt;line-height:1}"
                + ".about-orn.flip{transform:scaleX(-1)}"
                + ".about p{margin:0;font-size:8.6pt;line-height:1.5;text-align:justify;"
                + "hyphens:auto;overflow-wrap:break-word}"

                + ".band-wrap{display:flex;align-items:center;gap:3mm;margin:4mm 0 3mm}"
                + ".band-rule{flex:1;height:1px;background:#C9A227}"
                + ".kundali-band{background:#7B1113;color:#fff;letter-spacing:2px;font-size:10pt;"
                + "font-weight:700;padding:1.5mm 7mm;border-radius:1.5mm}"
                + ".kundali{display:flex;gap:3mm;align-items:flex-start}"
                + ".kundali-table{flex:1;border-collapse:collapse;font-size:8.6pt;border:1px solid #e0d3ae}"
                + ".kundali-table td{border:1px solid #e0d3ae;padding:1.1mm 1.8mm;vertical-align:middle}"
                + ".kundali-table .ki{width:6mm;text-align:center}"
                + ".kundali-table .ki svg{width:3.6mm;height:3.6mm;vertical-align:middle}"
                + ".kundali-table .kl{width:45%}"
                + ".kundali-table .kc{width:3mm;color:#8a7f6d}"
                + ".kundali-table .kv2{font-weight:600}"

                + ".chart-wrap{flex:1;text-align:center}"
                + ".chart-title{color:#7B1113;font-size:9.5pt;font-weight:700;letter-spacing:1px;margin-bottom:1.5mm}"
                + ".chart-title span{font-size:7.5pt;letter-spacing:.5px}"
                + ".chart{border:1.2px solid #8B1A1A;padding:.8mm;background:#fffdf7;display:inline-block}"
                + ".chart svg{width:55mm;height:55mm;display:block}"
                + ".chart-missing{color:#8a7f6d;font-size:9pt;padding:6mm;border:1px dashed #d8c9a4}"

                + ".kundali-none{border:1px dashed #C9A227;background:#fffdf4;padding:4mm 6mm;"
                + "text-align:center;border-radius:2mm}"
                + ".kundali-none-title{color:#7B1113;font-size:10pt;font-weight:700;margin-bottom:1.5mm}"
                + ".kundali-none p{margin:0 auto;max-width:120mm;font-size:8.6pt;line-height:1.5;color:#6b6152}"

                // auto top margin pins the footer to the bottom of the sheet
                // however much content sits above it, so a sparse profile does
                // not leave the closing line floating in the middle.
                + ".footer{margin-top:auto;padding-top:2.5mm;border-top:1px solid #e3d7b8;text-align:center;"
                + "color:#7B1113;font-size:9pt;line-height:1.45}"
                + ".footer-id{text-align:center;color:#a2957f;font-size:7.5pt;margin-top:1mm}"
                + "</style>";
    }
}
