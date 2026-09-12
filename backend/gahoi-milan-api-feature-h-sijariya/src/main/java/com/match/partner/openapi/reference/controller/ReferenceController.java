package com.match.partner.openapi.reference.controller;

import com.match.partner.openapi.reference.model.dao.State;
import com.match.partner.openapi.reference.model.dto.CityDto;
import com.match.partner.openapi.reference.model.dto.OptionDto;
import com.match.partner.openapi.reference.model.dto.StateDto;
import com.match.partner.openapi.reference.repository.CityRepository;
import com.match.partner.openapi.reference.repository.LookupOptionRepository;
import com.match.partner.openapi.reference.repository.StateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Dropdown data for the profile forms.
 *
 * Every option list used to be a hardcoded array in profile-setup.tsx, which
 * meant adding a city or a degree required an app release and two screens could
 * disagree. These endpoints make the database the single source.
 *
 * Nothing here is user-specific or sensitive, so responses are cacheable and
 * the endpoints are safe to expose without a token.
 */
@RestController
@RequestMapping("/api/v1/reference")
@RequiredArgsConstructor
public class ReferenceController {

    private final LookupOptionRepository lookupOptionRepository;
    private final StateRepository stateRepository;
    private final CityRepository cityRepository;

    /**
     * Every category in one response.
     *
     * The profile form needs a dozen lists at once; fetching them individually
     * would mean a dozen round trips on a screen the user is already waiting on.
     * The whole payload is a few KB.
     */
    @GetMapping("/options")
    public ResponseEntity<Map<String, List<OptionDto>>> allOptions() {
        Map<String, List<OptionDto>> grouped = new HashMap<>();

        lookupOptionRepository.findByActiveTrueOrderByCategoryAscSortOrderAsc()
                .forEach(o -> grouped
                        .computeIfAbsent(o.getCategory(), k -> new java.util.ArrayList<>())
                        .add(new OptionDto(o.getCode(), o.getLabel())));

        return ResponseEntity.ok(grouped);
    }

    /** A single list, for screens that only need one. */
    @GetMapping("/options/{category}")
    public ResponseEntity<List<OptionDto>> options(@PathVariable String category) {
        List<OptionDto> options = lookupOptionRepository
                .findByCategoryAndActiveTrueOrderBySortOrderAsc(category)
                .stream()
                .map(o -> new OptionDto(o.getCode(), o.getLabel()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(options);
    }

    @GetMapping("/states")
    public ResponseEntity<List<StateDto>> states() {
        List<StateDto> states = stateRepository.findAllByOrderByNameAsc()
                .stream()
                .map(s -> new StateDto(s.getId(), s.getCode(), s.getName(), s.getKind()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(states);
    }

    /**
     * Cities in a state, metros first.
     *
     * Accepts either the numeric id or the ISO code ("MP"), because the profile
     * stores the state name while the picker holds the id - and callers should
     * not have to care which they have.
     */
    @GetMapping("/cities")
    public ResponseEntity<List<CityDto>> cities(@RequestParam(required = false) Integer stateId,
                                                @RequestParam(required = false) String stateCode,
                                                @RequestParam(required = false) String search,
                                                @RequestParam(required = false) Integer limit,
                                                @RequestParam(required = false) Integer maxTier,
                                                @RequestParam(required = false) Boolean alphabetical,
                                                @RequestParam(required = false) Integer page,
                                                @RequestParam(required = false) Integer size) {

        // A-Z browse: no state to scope it, nothing typed. Opt-in via its own
        // flag rather than inferred from page/size being present, so an old
        // client that happens to send page=0 for some other reason cannot
        // silently switch behaviour.
        if (Boolean.TRUE.equals(alphabetical) && (search == null || search.isBlank()) && stateId == null
                && (stateCode == null || stateCode.isBlank())) {
            int pageNum = page == null ? 0 : Math.max(page, 0);
            int pageSize = Math.min(Math.max(size == null ? 50 : size, 1), 100);
            return ResponseEntity.ok(toDtos(
                    cityRepository.findAllByOrderByNameAsc(
                            org.springframework.data.domain.PageRequest.of(pageNum, pageSize)
                    ).getContent()));
        }

        if (search != null && !search.isBlank()) {
            // Bounded and ranked - see CityRepository.search. A one-letter query
            // is refused rather than served, because it matches most of the
            // table and the member has not told us anything yet.
            String q = search.trim();
            if (q.length() < 2) {
                return ResponseEntity.ok(List.of());
            }
            int capped = Math.min(Math.max(limit == null ? 25 : limit, 1), 50);
            return ResponseEntity.ok(toDtos(cityRepository.search(q, capped)));
        }

        Integer resolved = stateId;
        if (resolved == null && stateCode != null && !stateCode.isBlank()) {
            resolved = stateRepository.findByCode(stateCode.trim().toUpperCase())
                    .map(State::getId)
                    .orElse(null);
        }

        if (resolved != null) {
            return ResponseEntity.ok(toDtos(
                    cityRepository.findByStateIdOrderByTierAscNameAsc(resolved)));
        }

        // No state given: return the notable cities rather than all 200, which is
        // what a "popular cities" picker wants.
        int tier = maxTier == null ? 2 : maxTier;
        return ResponseEntity.ok(toDtos(
                cityRepository.findByTierLessThanEqualOrderByTierAscNameAsc(tier)));
    }

    private List<CityDto> toDtos(List<com.match.partner.openapi.reference.model.dao.City> cities) {
        // One lookup for the whole page instead of a query per city.
        Map<Integer, String> stateNames = stateRepository.findAll().stream()
                .collect(Collectors.toMap(State::getId, State::getName));

        return cities.stream()
                .map(c -> new CityDto(c.getId(), c.getName(), c.getTier(),
                        stateNames.get(c.getStateId())))
                .collect(Collectors.toList());
    }
}
