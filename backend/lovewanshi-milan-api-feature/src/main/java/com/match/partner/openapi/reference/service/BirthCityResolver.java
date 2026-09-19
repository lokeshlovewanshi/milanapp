package com.match.partner.openapi.reference.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.match.partner.common.configuration.ClientException;
import com.match.partner.openapi.reference.model.dao.City;
import com.match.partner.openapi.reference.model.dao.State;
import com.match.partner.openapi.reference.repository.CityRepository;
import com.match.partner.openapi.reference.repository.StateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.List;

/**
 * Resolves a manually entered Indian birth city once, then keeps the result in
 * our own city table. GeoNames is never called for a city that already has
 * stored coordinates.
 */
@Service
@RequiredArgsConstructor
public class BirthCityResolver {

    private final CityRepository cityRepository;
    private final StateRepository stateRepository;

    @Value("${geonames.username:}")
    private String geoNamesUsername;

    @Value("${geonames.base-url:https://secure.geonames.org}")
    private String geoNamesBaseUrl;

    public City resolve(String value) {
        if (value == null || value.isBlank()) {
            throw new ClientException(HttpStatus.BAD_REQUEST, "Birth place is required.");
        }
        String requested = value.trim();
        List<City> cached = cityRepository.findByNameIgnoreCaseOrderByTierAsc(requested);
        for (City city : cached) {
            if (city.getLatitude() != null && city.getLongitude() != null) return city;
        }

        if (geoNamesUsername == null || geoNamesUsername.isBlank()) {
            throw new ClientException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Birth-city lookup is not configured yet. Please select a city from the list.");
        }

        JsonNode results;
        try {
            results = RestClient.create(geoNamesBaseUrl).get()
                    .uri(uri -> uri.path("/searchJSON")
                            .queryParam("q", requested)
                            .queryParam("country", "IN")
                            .queryParam("featureClass", "P")
                            .queryParam("maxRows", 10)
                            .queryParam("username", geoNamesUsername)
                            .build())
                    .retrieve()
                    .body(JsonNode.class);
        } catch (Exception e) {
            throw new ClientException(HttpStatus.BAD_GATEWAY,
                    "Could not look up that birth city. Please try again.");
        }

        JsonNode match = preferredIndianCityWithKnownState(results);
        if (match == null) {
            throw new ClientException(HttpStatus.BAD_REQUEST,
                    "We could not find that city in India. Please check the spelling and try again.");
        }

        State state = stateRepository.findByNameIgnoreCase(match.path("adminName1").asText())
                .orElseThrow(() -> new ClientException(HttpStatus.BAD_REQUEST,
                        "We found the city but could not match its state in our records. Please select a suggested city."));

        City city = cached.isEmpty() ? new City() : cached.get(0);
        city.setName(requested); // Preserve the member's entered city name for future cache hits.
        city.setStateId(state.getId());
        city.setTier(city.getTier() == null ? 3 : city.getTier());
        try {
            city.setLatitude(new BigDecimal(match.path("lat").asText()));
            city.setLongitude(new BigDecimal(match.path("lng").asText()));
        } catch (NumberFormatException e) {
            throw new ClientException(HttpStatus.BAD_GATEWAY,
                    "The city lookup returned invalid coordinates. Please try another city name.");
        }
        return cityRepository.save(city);
    }

    /**
     * A city name can occur in several Indian states. The app's primary
     * community is in Madhya Pradesh, so prefer an exact Madhya Pradesh result
     * when it exists. Keep the first valid result as the fallback for every
     * other city/state.
     */
    private JsonNode preferredIndianCityWithKnownState(JsonNode results) {
        if (results == null || !results.path("geonames").isArray()) return null;
        JsonNode fallback = null;
        for (JsonNode item : results.path("geonames")) {
            if (!"IN".equalsIgnoreCase(item.path("countryCode").asText())) continue;
            String state = item.path("adminName1").asText();
            if (state.isBlank() || stateRepository.findByNameIgnoreCase(state).isEmpty()) continue;
            if ("Madhya Pradesh".equalsIgnoreCase(state)) return item;
            if (fallback == null) fallback = item;
        }
        return fallback;
    }
}
