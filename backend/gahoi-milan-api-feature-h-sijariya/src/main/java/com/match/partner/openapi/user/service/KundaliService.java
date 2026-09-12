package com.match.partner.openapi.user.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.match.partner.common.configuration.ClientException;
import com.match.partner.openapi.reference.model.dao.City;
import com.match.partner.openapi.reference.repository.CityRepository;
import com.match.partner.openapi.user.model.dao.Kundali;
import com.match.partner.openapi.user.model.dao.UserProfile;
import com.match.partner.openapi.user.repository.KundaliRepository;
import com.match.partner.openapi.user.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.services.lambda.LambdaClient;
import software.amazon.awssdk.services.lambda.model.InvokeRequest;
import software.amazon.awssdk.services.lambda.model.InvokeResponse;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Birth chart generation, via the kundali Lambda.
 *
 * The app does not call the function directly, and should not be able to. Its
 * inputs are a person's exact birth date, time and place - about as identifying
 * as personal data gets - so it sits behind this authenticated endpoint, which
 * reads those values from the caller's own profile rather than accepting them
 * from the client. That also means a member cannot generate a chart for someone
 * else by passing different values.
 *
 * Nothing is cached. A chart is deterministic from three fields that rarely
 * change, so caching looks tempting, but people correct their birth time after
 * asking a parent, and a stale chart is worse than a slow one. The function
 * runs in well under a second and costs a fraction of a paisa per call.
 */
@Service
@RequiredArgsConstructor
public class KundaliService {

    private static final Logger log = LoggerFactory.getLogger(KundaliService.class);

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final UserProfileRepository userProfileRepository;
    private final KundaliRepository kundaliRepository;
    private final CityRepository cityRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${kundali.function-name:lovewanshi-milan-kundali}")
    private String functionName;

    @Value("${kundali.match-function-name:lovewanshi-milan-kundali-match}")
    private String matchFunctionName;

    @Value("${kundali.enabled:true}")
    private boolean enabled;

    // The same three properties S3ServiceImpl takes. LambdaClient.create()
    // read none of them - it resolves purely from the ambient environment -
    // so a machine with aws.region set in application.properties and no
    // AWS_REGION exported still failed, which is every local checkout.
    @Value("${aws.region}")
    private String region;

    @Value("${aws.access.key.id:}")
    private String accessKey;

    @Value("${aws.secret.access.key:}")
    private String secretKey;

    /**
     * Built lazily and kept, because creating a LambdaClient resolves
     * credentials and endpoints - work worth doing once rather than per
     * request. Null until first use so an app with the feature disabled, or one
     * running locally with no AWS credentials, never constructs one.
     */
    private volatile LambdaClient lambda;

    /**
     * The caller's chart, from storage when it is still valid.
     *
     * Regenerates only when there is nothing stored, when the birth details
     * have changed since it was built, or when the caller explicitly asks.
     * Everything else is served from the database - a chart costs a Lambda
     * round trip that cold-starts, and it is deterministic from three fields
     * that almost never change.
     *
     * @param force true when the member pressed Regenerate
     */
    public JsonNode getOrGenerate(String userName, boolean force) {
        UserProfile profile = requireProfileWithBirthDetails(userName);
        String fingerprint = birthFingerprint(profile);

        if (!force) {
            Optional<Kundali> stored = kundaliRepository.findById(profile.getId());
            if (stored.isPresent() && fingerprint.equals(stored.get().getBirthFingerprint())) {
                try {
                    return objectMapper.readTree(stored.get().getChart());
                } catch (Exception e) {
                    // Unreadable stored chart is not worth failing over - fall
                    // through and rebuild it.
                    log.warn("Stored kundali for {} is unreadable, regenerating", profile.getId());
                }
            }
        }

        JsonNode chart = generate(profile);
        store(profile, chart, fingerprint);
        return chart;
    }

    /**
     * Ashtakoota score between the caller and another member.
     *
     * Both charts are fetched through the cache, so a match on a list of
     * candidates costs one generation per person ever, not one per comparison.
     */
    public JsonNode match(String userName, Integer otherProfileId) {
        UserProfile me = requireProfileWithBirthDetails(userName);
        if (!Boolean.TRUE.equals(me.getVerified())) {
            throw new ClientException(HttpStatus.FORBIDDEN, "Your profile is under verification. Please wait for admin approval.");
        }

        UserProfile other = userProfileRepository.findById(otherProfileId)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "Profile not found"));
        if (other.getDeletedAt() != null) {
            throw new ClientException(HttpStatus.NOT_FOUND, "This profile is no longer available");
        }
        if (!Boolean.TRUE.equals(other.getVerified())) {
            throw new ClientException(HttpStatus.NOT_FOUND, "This profile is not available or is under verification.");
        }
        if (other.getId().equals(me.getId())) {
            throw new ClientException(HttpStatus.BAD_REQUEST, "You cannot match a profile with itself.");
        }

        Kundali mine = ensureStored(me);
        Kundali theirs = ensureStored(other);

        // Boy and girl rather than a and b, because several kootas are counted
        // from one side to the other - Tara and Bhakoot are not symmetric, so
        // getting this the wrong way round silently changes the score.
        Kundali boy = isFemale(me) ? theirs : mine;
        Kundali girl = isFemale(me) ? mine : theirs;

        String payload;
        try {
            payload = objectMapper.writeValueAsString(Map.of(
                    "boy", Map.of("nakshatra", boy.getNakshatraIndex(), "rashi", boy.getRashiIndex()),
                    "girl", Map.of("nakshatra", girl.getNakshatraIndex(), "rashi", girl.getRashiIndex())
            ));
        } catch (Exception e) {
            throw new ClientException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not build the request");
        }

        JsonNode score = invoke(matchFunctionName, payload);

        // The other person's chart travels with the score, so the screen needs
        // one round trip rather than two. Sharing a kundali is the point of the
        // exercise in a matrimony context - it is what families exchange - but
        // note it does encode an exact birth time, so it goes only to a signed-in
        // member looking at a profile that is visible to them.
        ObjectNode combined = objectMapper.createObjectNode();
        combined.set("match", score);
        combined.set("theirs", readChart(theirs));
        combined.set("mine", readChart(mine));
        combined.put("theirName", other.getName());
        return combined;
    }

    /** The stored chart as JSON, or null if it will not parse. */
    private JsonNode readChart(Kundali row) {
        try {
            return objectMapper.readTree(row.getChart());
        } catch (Exception e) {
            log.warn("Stored kundali for {} is unreadable", row.getUserId());
            return null;
        }
    }

    /** Whether we can tell this member is female. Unknown counts as not. */
    private boolean isFemale(UserProfile p) {
        return p.getGender() != null && p.getGender().trim().equalsIgnoreCase("female");
    }

    private Kundali ensureStored(UserProfile profile) {
        String fingerprint = birthFingerprint(profile);
        Optional<Kundali> stored = kundaliRepository.findById(profile.getId());
        if (stored.isPresent() && fingerprint.equals(stored.get().getBirthFingerprint())) {
            return stored.get();
        }
        JsonNode chart = generate(profile);
        return store(profile, chart, fingerprint);
    }

    /**
     * Nakshatra and rashi names in their canonical order, so an index can be
     * recovered when the Lambda does not send one.
     *
     * Duplicating the Lambda's lists is not ideal, but the alternative is
     * worse: JsonNode.asInt() returns 0 for a missing field, so an older
     * function silently stored Revati as index 0 (Ashwini) and Meen as 0
     * (Mesh). Matching would then have produced a confident, completely wrong
     * score - the kind of failure nobody notices because the output still
     * looks like a number.
     */
    private static final List<String> NAKSHATRAS = List.of(
            "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
            "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
            "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
            "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta",
            "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati");

    private static final List<String> RASHIS = List.of(
            "Mesh", "Vrishabh", "Mithun", "Kark", "Simha", "Kanya",
            "Tula", "Vrishchik", "Dhanu", "Makar", "Kumbh", "Meen");

    /**
     * The index the Lambda sent, or the position of the name it sent.
     *
     * Throws rather than defaulting, because every wrong value here is
     * invisible downstream - it produces a plausible score from the wrong
     * inputs.
     */
    private int indexOf(JsonNode chart, String indexField, String nameField, List<String> names) {
        JsonNode index = chart.get(indexField);
        if (index != null && index.isInt()) {
            return index.asInt();
        }

        String name = chart.path(nameField).asText("");
        int position = names.indexOf(name);
        if (position >= 0) {
            log.debug("{} absent from the chart, derived {} from '{}'", indexField, position, name);
            return position;
        }

        throw new ClientException(HttpStatus.BAD_GATEWAY,
                "The chart service returned no " + indexField + " and an unrecognised "
                        + nameField + " ('" + name + "'). It may need redeploying.");
    }

    private Kundali store(UserProfile profile, JsonNode chart, String fingerprint) {
        Kundali row = new Kundali();
        row.setUserId(profile.getId());
        row.setChart(chart.toString());
        row.setNakshatraIndex(indexOf(chart, "nakshatra_index", "nakshatra", NAKSHATRAS));
        row.setRashiIndex(indexOf(chart, "moon_sign_index", "moon_sign", RASHIS));
        row.setNakshatra(chart.path("nakshatra").asText(""));
        row.setRashi(chart.path("moon_sign").asText(""));
        row.setManglik(chart.path("manglik").asBoolean(false));
        row.setBirthFingerprint(fingerprint);
        row.setGeneratedAt(LocalDateTime.now());
        return kundaliRepository.save(row);
    }

    /**
     * Identifies the inputs a chart was built from.
     *
     * Any change to date, time or place makes the stored chart wrong, and this
     * is what makes that detectable without storing the three values again.
     */
    private String birthFingerprint(UserProfile p) {
        String raw = p.getDateOfBirth() + "|" + p.getTimeOfBirth() + "|" + p.getPlaceOfBirth();
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(64);
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception e) {
            throw new ClientException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not fingerprint birth details");
        }
    }

    private UserProfile requireProfileWithBirthDetails(String userName) {
        if (!enabled) {
            throw new ClientException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Kundali generation is turned off on this server.");
        }

        UserProfile profile = userProfileRepository.findByEmail(userName)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "Profile not found"));
        return requireBirthDetails(profile);
    }

    private UserProfile requireBirthDetails(UserProfile profile) {
        LocalDateTime dob = profile.getDateOfBirth();
        String tob = profile.getTimeOfBirth();
        String pob = profile.getPlaceOfBirth();

        // Checked here rather than in the Lambda so the member gets a message
        // naming the field to fill in, instead of a 400 from a service they
        // have never heard of. Time is as required as date: an hour of error
        // moves the ascendant by roughly a whole sign, which changes every
        // house placement, so a chart built on a guess is confidently wrong.
        if (dob == null) {
            throw new ClientException(HttpStatus.BAD_REQUEST,
                    "Add your date of birth to your profile first.");
        }
        if (tob == null || tob.isBlank()) {
            throw new ClientException(HttpStatus.BAD_REQUEST,
                    "Add your time of birth to your profile first - a kundali cannot be "
                            + "calculated without it.");
        }
        if (pob == null || pob.isBlank()) {
            throw new ClientException(HttpStatus.BAD_REQUEST,
                    "Add your place of birth to your profile first.");
        }
        return profile;
    }

    private JsonNode generate(UserProfile profile) {
        LocalDateTime dob = profile.getDateOfBirth();
        String tob = profile.getTimeOfBirth();
        String pob = profile.getPlaceOfBirth();

        // Coordinates, not the name. The function carries a short list of known
        // cities as a convenience, and anything outside it is a 400 - which is
        // exactly what happened, because birth place used to be free text and
        // the stored values include "Nihal" and "Hdhdjd". Resolving the city
        // here means the function is given a real location every time.
        City city = resolveCity(pob);

        String payload;
        try {
            payload = objectMapper.writeValueAsString(Map.of(
                    "date", dob.format(DATE),
                    // The Lambda wants HH:MM. The column holds a SQL time, which
                    // arrives as HH:MM:SS.
                    "time", tob.length() >= 5 ? tob.substring(0, 5) : tob,
                    "place", city.getName(),
                    "latitude", city.getLatitude(),
                    "longitude", city.getLongitude()
            ));
        } catch (Exception e) {
            throw new ClientException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not build the request");
        }

        return invoke(functionName, payload);
    }

    private JsonNode invoke(String function, String payload) {
        InvokeResponse response;
        try {
            response = client().invoke(InvokeRequest.builder()
                    .functionName(function)
                    .payload(SdkBytes.fromUtf8String(payload))
                    .build());
        } catch (Exception e) {
            log.error("Could not invoke {}: {}", function, e.getMessage());
            throw new ClientException(HttpStatus.BAD_GATEWAY,
                    "Could not reach the chart service. Please try again.");
        }

        // Two distinct failures share one status code here. A Lambda that threw
        // sets FunctionError and puts the stack trace in the payload; a Lambda
        // that ran fine but returned a 4xx puts that in its own statusCode.
        // Both need unpicking or the member sees "success" with no chart.
        if (response.functionError() != null) {
            log.error("{} raised: {}", function, response.payload().asUtf8String());
            throw new ClientException(HttpStatus.BAD_GATEWAY,
                    "The chart service failed. Please try again.");
        }

        JsonNode envelope;
        try {
            envelope = objectMapper.readTree(response.payload().asUtf8String());
        } catch (Exception e) {
            throw new ClientException(HttpStatus.BAD_GATEWAY, "The chart service returned nothing usable.");
        }

        int status = envelope.path("statusCode").asInt(200);
        JsonNode body;
        try {
            body = objectMapper.readTree(envelope.path("body").asText("{}"));
        } catch (Exception e) {
            throw new ClientException(HttpStatus.BAD_GATEWAY, "The chart service returned nothing usable.");
        }

        if (status != 200) {
            // The Lambda's own message is worth surfacing - "Unknown place
            // 'Foo'" tells the member exactly what to change.
            throw new ClientException(HttpStatus.BAD_REQUEST,
                    body.path("error").asText("The chart could not be generated."));
        }

        return body;
    }

    /**
     * The city a birth place refers to.
     *
     * Birth place is stored as a name rather than a city id, because it was
     * free text long before the dropdown existed and the old values have to
     * keep resolving. An exact, case-insensitive match ordered by tier picks
     * the well-known city when a name repeats.
     *
     * Anything unrecognised is refused rather than guessed. A fuzzy match here
     * would silently compute a chart for the wrong place, and a chart built on
     * the wrong location is wrong in every house - while still looking
     * completely normal.
     */
    private City resolveCity(String placeOfBirth) {
        List<City> hits = cityRepository.findByNameIgnoreCaseOrderByTierAsc(placeOfBirth.trim());

        if (hits.isEmpty()) {
            throw new ClientException(HttpStatus.BAD_REQUEST,
                    "We do not recognise '" + placeOfBirth + "' as a city. Please pick your "
                            + "birth place from the list in your profile.");
        }

        City city = hits.get(0);
        if (city.getLatitude() == null || city.getLongitude() == null) {
            throw new ClientException(HttpStatus.BAD_REQUEST,
                    "We do not have the location of " + city.getName() + " yet, so a kundali "
                            + "cannot be calculated. Please contact support.");
        }
        return city;
    }

    private LambdaClient client() {
        LambdaClient existing = lambda;
        if (existing != null) {
            return existing;
        }
        synchronized (this) {
            if (lambda == null) {
                // Built from configuration rather than LambdaClient.create(),
                // which consults only environment variables, the shared config
                // file and the EC2 metadata service. On the instance that works
                // because the deploy exports AWS_REGION; on a laptop it does
                // not, and the failure surfaced as "Could not reach the chart
                // service" - blaming the Lambda for a client that was never
                // built.
                //
                // Keys are optional and usually absent: blank falls through to
                // DefaultCredentialsProvider, which picks up the instance role
                // in production. Same contract as S3ServiceImpl.
                boolean haveKeys = accessKey != null && !accessKey.isBlank()
                        && secretKey != null && !secretKey.isBlank();

                lambda = LambdaClient.builder()
                        .region(Region.of(region))
                        .credentialsProvider(haveKeys
                                ? StaticCredentialsProvider.create(
                                        AwsBasicCredentials.create(accessKey, secretKey))
                                : DefaultCredentialsProvider.create())
                        .build();
            }
            return lambda;
        }
    }
}
