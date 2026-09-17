package com.match.partner.openapi.user.service;

import com.match.partner.openapi.user.model.UserProfileMapper;
import com.match.partner.common.configuration.CacheConfiguration;
import com.match.partner.openapi.user.model.dao.Status;
import com.match.partner.openapi.user.model.dao.UserProfile;
import com.match.partner.openapi.user.model.dto.ProfileRegistrationDto;
import com.match.partner.openapi.user.model.dto.UserDto;
import com.match.partner.openapi.user.model.dto.UserProfileDTO;
import com.match.partner.openapi.user.model.dto.BasicInfoDTO;
import com.match.partner.openapi.user.model.dto.ContactInfoDTO;
import com.match.partner.openapi.user.model.dto.EducationInfoDTO;
import com.match.partner.openapi.user.model.dto.FamilyInfoDTO;
import com.match.partner.openapi.user.model.dto.ReligionInfoDTO;
import com.match.partner.openapi.user.model.dto.ProfileFilter;
import com.match.partner.openapi.profile.service.ProfileCompletionCalculator;
import com.match.partner.openapi.user.repository.UserProfileRepository;
import com.match.partner.openapi.views.service.ViewsServiceInterface;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.function.Function;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import com.match.partner.common.configuration.ClientException;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import com.match.partner.openapi.likes.model.ProfileLike;
import com.match.partner.openapi.likes.model.ProfileLikeId;
import com.match.partner.openapi.likes.repository.ProfileLikeRepository;
import com.match.partner.openapi.shortlist.repository.ShortlistRepository;
import com.match.partner.openapi.shortlist.model.dao.ShortlistId;

@Service
public class UserProfileServiceImpl implements UserProfileServiceInterface {

    @Autowired
    private UserProfileRepository userProfileRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private UserProfileMapper userProfileMapper;
    @Autowired
    private ViewsServiceInterface viewsService;
    @Autowired
    private com.match.partner.openapi.views.repository.ViewsRepository viewsRepository;
    @Autowired
    private ProfileLikeRepository profileLikeRepository;
    @Autowired
    private ShortlistRepository shortlistRepository;
    /** Decides whether a viewer has paid to see other members' contact details. */
    @Autowired
    private com.match.partner.openapi.billing.repository.MembershipRepository membershipRepository;
    @Autowired
    private com.match.partner.openapi.reference.repository.LookupOptionRepository lookupOptionRepository;
    /**
     * Rescores the profile before each save, inside the same transaction, so
     * the stored percentage can never disagree with the data it describes.
     */
    @Autowired
    private ProfileCompletionCalculator completionCalculator;


    public UserProfile updateUserProfile(UserProfileDTO dto, UserProfile userProfile) {
        if (dto.getName() != null) {
            userProfile.setName(dto.getName());
        }
        // Blank is treated as "not provided", not as "clear it" - an edit form
        // with an unselected placeholder option must not be able to blank out
        // an already-valid marital status and break filtering the same way
        // the display-label bug once did (see MaritalStatus's own doc comment).
        if (dto.getMaritalStatus() != null && !dto.getMaritalStatus().isBlank()) {
            com.match.partner.openapi.user.model.dao.MaritalStatus.validate(dto.getMaritalStatus());
            userProfile.setMaritalStatus(dto.getMaritalStatus());
        }
        if (dto.getGender() != null) {
            userProfile.setGender(dto.getGender());
        }
        if (dto.getComplexion() != null) {
            userProfile.setComplexion(dto.getComplexion());
        }
        if (dto.getHeight() != null) {
            userProfile.setHeight(dto.getHeight());
        }
        if (dto.getWeight() != null) {
            userProfile.setWeight(dto.getWeight());
        }
        if (dto.getDiet() != null) {
            userProfile.setDiet(dto.getDiet());
        }
        if (dto.getDisability() != null) {
            userProfile.setDisability(dto.getDisability());
        }
        if (dto.getBloodGroup() != null) {
            userProfile.setBloodGroup(dto.getBloodGroup());
        }
        if (dto.getProfileCreatedBy() != null) {
            userProfile.setProfileCreatedBy(dto.getProfileCreatedBy());
        }
        if (dto.getCountry() != null) {
            userProfile.setCountry(dto.getCountry());
        }
        if (dto.getState() != null) {
            userProfile.setState(dto.getState());
        }
        if (dto.getCity() != null) {
            userProfile.setCity(dto.getCity());
        }
        if (dto.getTown() != null) {
            userProfile.setTown(dto.getTown());
        }
        if (dto.getFathersContactNo() != null) {
            userProfile.setFathersContactNumber(dto.getFathersContactNo());
        }
        if (dto.getWhatsappNo() != null) {
            userProfile.setWhatsappNumber(dto.getWhatsappNo());
        }
        if (dto.getPresentAddress() != null) {
            userProfile.setPresentAddress(dto.getPresentAddress());
        }
        if (dto.getPermanentAddress() != null) {
            userProfile.setPermanentAddress(dto.getPermanentAddress());
        }
        if (dto.getGotra() != null) {
            userProfile.setGotra(dto.getGotra());
        }
        if (dto.getAakna() != null) {
            userProfile.setAakna(dto.getAakna());
        }
        if (dto.getMotherTongue() != null) {
            userProfile.setMotherTongue(dto.getMotherTongue());
        }
        if (dto.getDateOfBirth() != null) {
            userProfile.setDateOfBirth(dto.getDateOfBirth());
        }
        if (dto.getTimeOfBirth() != null) {
            userProfile.setTimeOfBirth(dto.getTimeOfBirth());
        }
        if (dto.getPlaceOfBirth() != null) {
            userProfile.setPlaceOfBirth(dto.getPlaceOfBirth());
        }
        if (dto.getZodiac() != null) {
            userProfile.setZodiac(dto.getZodiac());
        }
        if (dto.getFathersName() != null) {
            userProfile.setFathersName(dto.getFathersName());
        }
        if (dto.getFathersOccupation() != null) {
            userProfile.setFathersOccupation(dto.getFathersOccupation());
        }
        if (dto.getMothersName() != null) {
            userProfile.setMothersName(dto.getMothersName());
        }
        if (dto.getMothersOccupation() != null) {
            userProfile.setMothersOccupation(dto.getMothersOccupation());
        }
        if (dto.getMarriedBrothers() != null) {
            userProfile.setNoOfMarriedBrothers(dto.getMarriedBrothers());
        }
        if (dto.getUnmarriedBrothers() != null) {
            userProfile.setNoOfUnmarriedBrothers(dto.getUnmarriedBrothers());
        }
        if (dto.getMarriedSisters() != null) {
            userProfile.setNoOfMarriedSisters(dto.getMarriedSisters());
        }
        if (dto.getUnmarriedSisters() != null) {
            userProfile.setNoOfUnmarriedSisters(dto.getUnmarriedSisters());
        }
        if (dto.getMaternalUnclesName() != null) {
            userProfile.setMaternalUnclesName(dto.getMaternalUnclesName());
        }
        if (dto.getMaternalUnclesGotra() != null) {
            userProfile.setMaternalUnclesGotra(dto.getMaternalUnclesGotra());
        }
        if (dto.getHouseStatus() != null) {
            userProfile.setHouseStatus(dto.getHouseStatus());
        }
        if (dto.getCarStatus() != null) {
            userProfile.setCarStatus(dto.getCarStatus());
        }
        if (dto.getEducation() != null) {
            userProfile.setEducation(dto.getEducation());
        }
        if (dto.getEducationDetails() != null) {
            userProfile.setEducationDetail(dto.getEducationDetails());
        }
        if (dto.getOccupationDetails() != null) {
            userProfile.setOccupationDetail(dto.getOccupationDetails());
        }
        if (dto.getAnnualIncome() != null) {
            userProfile.setAnnualIncome(dto.getAnnualIncome());
        }
        if (dto.getProfession() != null) {
            userProfile.setProfession(dto.getProfession());
        }
        if(dto.getAboutMyself() != null){
            userProfile.setAboutMyself(dto.getAboutMyself());
        }
        if(dto.getPartnerPreferences() != null){
            userProfile.setPartnerPreferences(dto.getPartnerPreferences());
        }
        if(dto.getManglik() != null){
            userProfile.setManglik(dto.getManglik());
        }
        if(dto.getNakshatra() != null){
            userProfile.setNakshatra(dto.getNakshatra());
        }
        if(dto.getWorkCity() != null){
            userProfile.setWorkCity(dto.getWorkCity());
        }
        if(dto.getEmployedIn() != null){
            userProfile.setEmployedIn(dto.getEmployedIn());
        }
        if(dto.getOrganization() != null){
            userProfile.setOrganization(dto.getOrganization());
        }
        if(dto.getOccupationStartDate() != null){
            userProfile.setOccupationStartDate(dto.getOccupationStartDate());
        }
        if(dto.getLastActive() != null){
            userProfile.setLastActive(dto.getLastActive());
        }

        completionCalculator.apply(userProfile);
        return userProfileRepository.save(userProfile);
    }

    public UserProfile registerProfile(ProfileRegistrationDto userProfileDTO, String userName){
        UserProfile userProfile = userProfileRepository.findByEmail(userName)
                .orElseThrow(() -> new RuntimeException("User with email " + userName + " not found"));

        if(userProfileDTO.getName()!=null){
            userProfile.setName(userProfileDTO.getName());
        }
        if(userProfileDTO.getGender()!=null){
            userProfile.setGender(userProfileDTO.getGender());
        }
        if(userProfileDTO.getDateOfBirth()!=null){
            userProfile.setDateOfBirth(userProfileDTO.getDateOfBirth());
        }
        if(userProfileDTO.getCountry()!=null){
            userProfile.setCountry(userProfileDTO.getCountry());
        }
        if(userProfileDTO.getCity()!=null){
            userProfile.setCity(userProfileDTO.getCity());
        }
        if(userProfileDTO.getState()!=null){
            userProfile.setState(userProfileDTO.getState());
        }
        if(userProfileDTO.getProfileCreatedBy()!=null){
            userProfile.setProfileCreatedBy(userProfileDTO.getProfileCreatedBy());
        }
        if(userProfileDTO.getMobileNo()!=null){
            userProfile.setMobileNumber(userProfileDTO.getMobileNo());
        }
        userProfile.setStatus(Status.CREATED);
        completionCalculator.apply(userProfile);
        return userProfileRepository.save(userProfile);
    }



    public void updateUserProfile(UserProfileDTO userProfileDTO, String userName) {
        UserProfile userProfile = userProfileRepository.findByEmail(userName)
                .orElseThrow(() -> new RuntimeException("User with email " + userName + " not found"));
        updateUserProfile(userProfileDTO, userProfile);

    }

    public void registerUserProfile(UserProfileDTO userProfileDTO, String userName) {
        UserProfile userProfile = userProfileRepository.findByEmail(userName)
                .orElseThrow(() -> new RuntimeException("User with email " + userName + " not found"));
        updateUserProfile(userProfileDTO, userProfile);

    }


    public UserProfileDTO getUser(String userName) {
        UserProfile userProfile = userProfileRepository.findByEmail(userName).get();
        return  userProfileMapper.toDto(userProfile);
    }

    /**
     * The gender a member is browsing for.
     *
     * Returns null when the caller's own gender is missing or is anything other
     * than the two values this app records, and null means "do not filter". A
     * member who has not filled in their gender yet still gets a populated feed
     * rather than an empty screen they cannot explain.
     */
    private String oppositeGenderOf(String gender) {
        if (gender == null) {
            return null;
        }
        String normalised = gender.trim().toLowerCase();
        if (normalised.equals("male")) {
            return "Female";
        }
        if (normalised.equals("female")) {
            return "Male";
        }
        return null;
    }

    /** The height category's sort_order for a lookup code, or null if the code is null or unknown. */
    private Integer heightSortOrder(String heightCode) {
        if (heightCode == null) {
            return null;
        }
        return lookupOptionRepository.findByCategoryAndActiveTrueOrderBySortOrderAsc("height").stream()
                .filter(o -> o.getCode().equals(heightCode))
                .map(o -> o.getSortOrder())
                .findFirst()
                .orElse(null);
    }

    /**
     * Hide or unhide the caller's own profile.
     *
     * Takes the email from the JWT rather than an id in the request, so a
     * member can only ever change their own visibility - there is no id to
     * tamper with.
     */
    @Override
    @CacheEvict(value = CacheConfiguration.FEATURED_STORIES_CACHE, allEntries = true)
    public void setProfileHidden(String userName, boolean hidden) {
        UserProfile profile = requireLiveProfile(userName);
        profile.setHidden(hidden);
        userProfileRepository.save(profile);
    }

    /**
     * Soft-delete the caller's own profile.
     *
     * Deliberately not a hard DELETE. Likes, shortlists, views and
     * notifications all hold this id, so removing the row would either fail on
     * the constraints or take other members' history with it. Stamping
     * deleted_at takes the profile out of every listing and refuses the direct
     * fetch, which is what "deleted" means to everyone else.
     *
     * The account is also hidden on the way out, so that if the row is ever
     * restored it comes back invisible rather than silently reappearing in
     * everyone's feed.
     */
    @Override
    public void deleteOwnProfile(String userName) {
        UserProfile profile = requireLiveProfile(userName);
        profile.setDeletedAt(LocalDateTime.now());
        profile.setHidden(true);
        userProfileRepository.save(profile);
    }

    private UserProfile requireLiveProfile(String userName) {
        UserProfile profile = userProfileRepository.findByEmail(userName)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "Profile not found"));

        if (profile.getDeletedAt() != null) {
            throw new ClientException(HttpStatus.GONE, "This profile has already been deleted");
        }
        return profile;
    }

    public Page<UserDto> getUsers(int page, int size, String userName, boolean oppositeGender) {
        return getUsers(page, size, userName, oppositeGender, ProfileFilter.NONE);
    }

    public Page<UserDto> getUsers(int page, int size, String userName, boolean oppositeGender, ProfileFilter filter) {
        // Newest members first. Secondary sort on id because two profiles created
        // in the same second would otherwise come back in an arbitrary order,
        // which makes a paged list drop or repeat rows between pages.
        Pageable pageable = PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id")));

        Optional<UserProfile> currentUserOptional = userProfileRepository.findByEmail(userName);
        if (currentUserOptional.isEmpty()) {
            return userProfileRepository.findAll(pageable).map(userProfileMapper::toUserDto);
        }
        UserProfile currentUser = currentUserOptional.get();
        int currentUserId = currentUser.getId();

        // Never list the caller to themselves. When the caller asked for
        // matches, narrow further to the gender they are looking for.
        String lookingFor = oppositeGender ? oppositeGenderOf(currentUser.getGender()) : null;

        Page<UserProfile> userProfilesPage;
        if (filter == null || filter.isEmpty()) {
            userProfilesPage = lookingFor == null
                    ? userProfileRepository.findByIdNot(currentUserId, pageable)
                    : userProfileRepository.findByIdNotAndGender(currentUserId, lookingFor, pageable);
        } else {
            // ageFrom/ageTo are years-old bounds; the query wants dates. "At
            // least ageFrom years old" means born on or before today minus
            // ageFrom years - the older bound on age is the EARLIER cutoff
            // date, which is why dobBefore comes from ageFrom and dobAfter
            // from ageTo even though that looks backwards at first glance.
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime dobBefore = filter.ageFrom() != null ? now.minusYears(filter.ageFrom()) : null;
            LocalDateTime dobAfter = filter.ageTo() != null ? now.minusYears(filter.ageTo() + 1L) : null;

            // Height filter arrives as lookup codes ("H_60"); the query wants
            // the height category's sort_order, which is what actually orders
            // short to tall - the code's own numeric suffix is not reliable
            // enough to parse (it drifts from the label past a point).
            Integer heightFromOrder = heightSortOrder(filter.heightFrom());
            Integer heightToOrder = heightSortOrder(filter.heightTo());

            userProfilesPage = userProfileRepository.findByIdNotFiltered(
                    currentUserId, lookingFor, dobBefore, dobAfter,
                    filter.maritalStatus(), filter.manglik(), filter.profession(),
                    heightFromOrder, heightToOrder, pageable);
        }

        return userProfilesPage.map(userProfile -> {
            UserDto userDto = userProfileMapper.toUserDto(userProfile);
            int viewedProfileId = userProfile.getId();

            // Look in both directions: a connection is the same relationship whether
            // we sent the interest or received and accepted it.
            Optional<ProfileLike> profileLike = profileLikeRepository
                    .findById(new ProfileLikeId(currentUserId, viewedProfileId))
                    .or(() -> profileLikeRepository.findById(new ProfileLikeId(viewedProfileId, currentUserId)));
            userDto.setIsLiked(profileLike.isPresent());
            userDto.setLikeStatus(profileLike.map(like -> like.getStatus().name()).orElse(null));

            ShortlistId shortlistId = new ShortlistId();
            shortlistId.setProfileId(currentUserId);
            shortlistId.setShortlistedId(viewedProfileId);
            boolean isShortlisted = shortlistRepository.existsById(shortlistId);
            userDto.setIsShortlisted(isShortlisted);

            long viewsCount = viewsRepository.countByIdProfileId(viewedProfileId);
            long connectsCount = profileLikeRepository.countByIdLikedProfileId(viewedProfileId);
            userDto.setViewsCount(viewsCount);
            userDto.setConnectsCount(connectsCount);

            return userDto;
        });
    }


    public UserProfileDTO getUsers(Integer id, String userName) {
        UserProfile userProfile = userProfileRepository.findById(id)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "Profile not found"));

        // A soft-deleted profile is gone as far as anyone else is concerned.
        // Filtering it out of the listings alone would not be enough: ids are
        // sequential and a deep link or an old notification still carries one,
        // so the direct fetch has to refuse too.
        //
        // Hidden profiles are deliberately still reachable by id. Someone who
        // has already connected, or who is looking at their own like history,
        // should not have the other person vanish - hiding is about not being
        // discovered in browse, not about cutting existing ties.
        if (userProfile.getDeletedAt() != null) {
            throw new ClientException(HttpStatus.NOT_FOUND, "This profile is no longer available");
        }
        UserProfile viewer = null;
        if (userName != null && !userName.trim().isEmpty()) {
            viewer = userProfileRepository.findByEmail(userName).orElse(null);
        }
        int profileId = viewer != null ? viewer.getId() : -1;

        // An unverified profile cannot be viewed by other members or guests.
        if (profileId != id) {
            if (!Boolean.TRUE.equals(userProfile.getVerified())) {
                throw new ClientException(HttpStatus.NOT_FOUND,
                        "This profile is not available or is under verification.");
            }
        }

        if (profileId > 0) {
            viewsService.addView(id, profileId);
        }

        // Unauthenticated Guest: Return ONLY basic details + photos (no contact, family details, or private data)
        if (viewer == null) {
            UserProfileDTO publicDto = userProfileMapper.toDto(userProfile);
            publicDto.setMobileNo(null);
            publicDto.setFathersContactNo(null);
            publicDto.setWhatsappNo(null);
            publicDto.setEmail(null);
            publicDto.setPresentAddress(null);
            publicDto.setPermanentAddress(null);
            publicDto.setIsLiked(false);
            publicDto.setIsShortlisted(false);
            return publicDto;
        }
        
        UserProfileDTO dto = userProfileMapper.toDto(userProfile);
        // Both directions - see getUsers(page,size,userName) above.
        Optional<ProfileLike> profileLike = profileLikeRepository
                .findById(new ProfileLikeId(profileId, id))
                .or(() -> profileLikeRepository.findById(new ProfileLikeId(id, profileId)));
        dto.setIsLiked(profileLike.isPresent());
        dto.setLikeStatus(profileLike.map(like -> like.getStatus().name()).orElse(null));

        ShortlistId shortlistId = new ShortlistId();
        shortlistId.setProfileId(profileId);
        shortlistId.setShortlistedId(id);
        dto.setIsShortlisted(shortlistRepository.existsById(shortlistId));

        // Contact details are earned, not public.
        //
        // The mapper copies the whole entity, so without this every phone
        // number, email and home address on the site was readable by any
        // signed-up account that could guess an id - and ids are sequential.
        // Not rendering them in the app was never protection: the values were
        // already in the JSON.
        //
        // Two ways to see them, and your own profile is always exempt:
        //
        //  - a verified member with an active membership, which is the paid
        //    tier's whole proposition;
        //  - anyone already connected, because that is what the app promised
        //    when it collected the fields ("Only shared with profiles you
        //    connect with"), and a connection should not stop working the day
        //    a membership lapses.
        //
        // Fully qualified: `Status` in this file is already the user-profile
        // one, which is a different enum entirely.
        // Contact details are only visible to users with an active membership
        // plan. Being connected alone is not enough — the plan is the gate.
        // Your own profile is always exempt.
        if (profileId != id && !maySeeContactDetails(viewer)) {
            redactContactDetails(dto);
        }

        return dto;
    }

    /**
     * Whether this member has paid for, and is entitled to, other members'
     * contact details.
     *
     * Verification is required as well as the membership: an unverified
     * profile is one nobody has confirmed belongs to a real person, and
     * selling that account a directory of phone numbers is precisely the
     * failure this gate exists to prevent.
     */
    private boolean maySeeContactDetails(UserProfile viewer) {
        if (viewer == null || viewer.getId() == null) {
            return false;
        }

        // Any member with an active membership plan is entitled to view contact details
        LocalDateTime now = LocalDateTime.now();
        return membershipRepository
                .findByUserProfileIdAndStatusOrderByStartsAtDesc(viewer.getId(), "ACTIVE")
                .stream()
                .anyMatch(m -> m.getExpiresAt() == null || m.getExpiresAt().isAfter(now));
    }

    /**
     * Blanks every field that identifies how to reach someone off-platform.
     *
     * Deliberately nulled rather than omitted from the DTO: a client that
     * renders "WhatsApp" whenever the field is present then shows nothing,
     * with no special case needed for "hidden".
     */
    private void redactContactDetails(UserProfileDTO dto) {
        dto.setWhatsappNo(null);
        dto.setMobileNo(null);
        dto.setFathersContactNo(null);
        dto.setEmail(null);
        dto.setPresentAddress(null);
        dto.setPermanentAddress(null);
    }

    @Override
    public BasicInfoDTO getBasicInfo(String userName) {
        UserProfile userProfile = userProfileRepository.findByEmail(userName)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return userProfileMapper.toBasicInfoDto(userProfile);
    }

    @Override
    public void updateBasicInfo(BasicInfoDTO dto, String userName) {
        UserProfile userProfile = userProfileRepository.findByEmail(userName)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (dto.getMobileNo() != null) userProfile.setMobileNumber(dto.getMobileNo());
        if (dto.getName() != null) userProfile.setName(dto.getName());
        if (dto.getProfileCreatedBy() != null) userProfile.setProfileCreatedBy(dto.getProfileCreatedBy());
        if (dto.getGender() != null) userProfile.setGender(dto.getGender());
        // Blank is treated as "not provided", not as "clear it" - an edit form
        // with an unselected placeholder option must not be able to blank out
        // an already-valid marital status and break filtering the same way
        // the display-label bug once did (see MaritalStatus's own doc comment).
        if (dto.getMaritalStatus() != null && !dto.getMaritalStatus().isBlank()) {
            com.match.partner.openapi.user.model.dao.MaritalStatus.validate(dto.getMaritalStatus());
            userProfile.setMaritalStatus(dto.getMaritalStatus());
        }
        if (dto.getDateOfBirth() != null) userProfile.setDateOfBirth(dto.getDateOfBirth());
        if (dto.getHeight() != null) userProfile.setHeight(dto.getHeight());
        if (dto.getWeight() != null) userProfile.setWeight(dto.getWeight());
        if (dto.getComplexion() != null) userProfile.setComplexion(dto.getComplexion());
        if (dto.getBloodGroup() != null) userProfile.setBloodGroup(dto.getBloodGroup());
        if (dto.getDiet() != null) userProfile.setDiet(dto.getDiet());
        if (dto.getDisability() != null) userProfile.setDisability(dto.getDisability());
        completionCalculator.apply(userProfile);
        userProfileRepository.save(userProfile);
    }

    @Override
    public ContactInfoDTO getContactInfo(String userName) {
        UserProfile userProfile = userProfileRepository.findByEmail(userName)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return userProfileMapper.toContactInfoDto(userProfile);
    }

    @Override
    public void updateContactInfo(ContactInfoDTO dto, String userName) {
        UserProfile userProfile = userProfileRepository.findByEmail(userName)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (dto.getMobileNo() != null) userProfile.setMobileNumber(dto.getMobileNo());
        if (dto.getWhatsappNo() != null) userProfile.setWhatsappNumber(dto.getWhatsappNo());
        if (dto.getCity() != null) userProfile.setCity(dto.getCity());
        if (dto.getState() != null) userProfile.setState(dto.getState());
        if (dto.getCountry() != null) userProfile.setCountry(dto.getCountry());
        if (dto.getPresentAddress() != null) userProfile.setPresentAddress(dto.getPresentAddress());
        if (dto.getPermanentAddress() != null) userProfile.setPermanentAddress(dto.getPermanentAddress());
        completionCalculator.apply(userProfile);
        userProfileRepository.save(userProfile);
    }

    @Override
    public ReligionInfoDTO getReligionInfo(String userName) {
        UserProfile userProfile = userProfileRepository.findByEmail(userName)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return userProfileMapper.toReligionInfoDto(userProfile);
    }

    @Override
    public void updateReligionInfo(ReligionInfoDTO dto, String userName) {
        UserProfile userProfile = userProfileRepository.findByEmail(userName)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (dto.getGotra() != null) userProfile.setGotra(dto.getGotra());
        if (dto.getAakna() != null) userProfile.setAakna(dto.getAakna());
        if (dto.getMotherTongue() != null) userProfile.setMotherTongue(dto.getMotherTongue());
        if (dto.getTimeOfBirth() != null) userProfile.setTimeOfBirth(dto.getTimeOfBirth());
        if (dto.getPlaceOfBirth() != null) userProfile.setPlaceOfBirth(dto.getPlaceOfBirth());
        if (dto.getZodiac() != null) userProfile.setZodiac(dto.getZodiac());
        if (dto.getManglik() != null) userProfile.setManglik(dto.getManglik());
        if (dto.getNakshatra() != null) userProfile.setNakshatra(dto.getNakshatra());
        completionCalculator.apply(userProfile);
        userProfileRepository.save(userProfile);
    }

    @Override
    public EducationInfoDTO getEducationInfo(String userName) {
        UserProfile userProfile = userProfileRepository.findByEmail(userName)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return userProfileMapper.toEducationInfoDto(userProfile);
    }

    @Override
    public void updateEducationInfo(EducationInfoDTO dto, String userName) {
        UserProfile userProfile = userProfileRepository.findByEmail(userName)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (dto.getEducation() != null) userProfile.setEducation(dto.getEducation());
        if (dto.getEducationDetails() != null) userProfile.setEducationDetail(dto.getEducationDetails());
        if (dto.getProfession() != null) userProfile.setProfession(dto.getProfession());
        if (dto.getOccupationDetails() != null) userProfile.setOccupationDetail(dto.getOccupationDetails());
        if (dto.getEmployedIn() != null) userProfile.setEmployedIn(dto.getEmployedIn());
        if (dto.getOrganization() != null) userProfile.setOrganization(dto.getOrganization());
        if (dto.getWorkCity() != null) userProfile.setWorkCity(dto.getWorkCity());
        if (dto.getAnnualIncome() != null) userProfile.setAnnualIncome(dto.getAnnualIncome());
        if (dto.getOccupationStartDate() != null) userProfile.setOccupationStartDate(dto.getOccupationStartDate());
        completionCalculator.apply(userProfile);
        userProfileRepository.save(userProfile);
    }

    @Override
    public FamilyInfoDTO getFamilyInfo(String userName) {
        UserProfile userProfile = userProfileRepository.findByEmail(userName)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return userProfileMapper.toFamilyInfoDto(userProfile);
    }

    @Override
    public void updateFamilyInfo(FamilyInfoDTO dto, String userName) {
        UserProfile userProfile = userProfileRepository.findByEmail(userName)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (dto.getFathersName() != null) userProfile.setFathersName(dto.getFathersName());
        if (dto.getFathersOccupation() != null) userProfile.setFathersOccupation(dto.getFathersOccupation());
        if (dto.getFathersContactNo() != null) userProfile.setFathersContactNumber(dto.getFathersContactNo());
        if (dto.getMothersName() != null) userProfile.setMothersName(dto.getMothersName());
        if (dto.getMothersOccupation() != null) userProfile.setMothersOccupation(dto.getMothersOccupation());
        if (dto.getMarriedBrothers() != null) userProfile.setNoOfMarriedBrothers(dto.getMarriedBrothers());
        if (dto.getUnmarriedBrothers() != null) userProfile.setNoOfUnmarriedBrothers(dto.getUnmarriedBrothers());
        if (dto.getMarriedSisters() != null) userProfile.setNoOfMarriedSisters(dto.getMarriedSisters());
        if (dto.getUnmarriedSisters() != null) userProfile.setNoOfUnmarriedSisters(dto.getUnmarriedSisters());
        if (dto.getMaternalUnclesName() != null) userProfile.setMaternalUnclesName(dto.getMaternalUnclesName());
        if (dto.getMaternalUnclesGotra() != null) userProfile.setMaternalUnclesGotra(dto.getMaternalUnclesGotra());
        if (dto.getHouseStatus() != null) userProfile.setHouseStatus(dto.getHouseStatus());
        if (dto.getCarStatus() != null) userProfile.setCarStatus(dto.getCarStatus());
        if (dto.getPartnerPreferences() != null) userProfile.setPartnerPreferences(dto.getPartnerPreferences());
        if (dto.getAboutMyself() != null) userProfile.setAboutMyself(dto.getAboutMyself());
        completionCalculator.apply(userProfile);
        userProfileRepository.save(userProfile);
    }

    /**
     * Set or change this account's password.
     *
     * `currentPassword` is required only when one was ever chosen. A Google
     * account holds a hash of a random UUID, so demanding the current password
     * there would lock the owner out of a feature meant for them - they cannot
     * produce a value that was generated on the server and never shown to
     * anyone. `passwordSet` is what tells the two cases apart.
     *
     * Skipping the check for those accounts is not a hole: reaching here at all
     * needs a valid session, which needs a Google sign-in Google itself
     * verified. What the check actually defends is the borrowed-unlocked-phone
     * case, and for an account with a real password that defence stays.
     */
    @Override
    public void changePassword(String userName, String currentPassword, String newPassword) {
        if (newPassword == null || newPassword.length() < 8) {
            throw new ClientException(HttpStatus.BAD_REQUEST,
                    "Your password must be at least 8 characters.");
        }

        UserProfile profile = requireLiveProfile(userName);

        // The stored hash decides, with the flag as a second condition rather
        // than the only one. A row with no password but password_set = 1 - which
        // the original backfill created for every Google account - would
        // otherwise demand a current password that does not exist and then
        // bcrypt-compare the answer against null, which cannot match. That
        // member could never set a password by any route.
        boolean hasStoredPassword = profile.getPassword() != null && !profile.getPassword().isBlank();

        if (profile.isPasswordSet() && hasStoredPassword) {
            if (currentPassword == null || currentPassword.isBlank()) {
                throw new ClientException(HttpStatus.BAD_REQUEST,
                        "Please enter your current password.");
            }
            if (!passwordEncoder.matches(currentPassword, profile.getPassword())) {
                // Deliberately not "wrong password" vs "no such account" - the
                // caller is already authenticated, so there is nothing to
                // enumerate, but keeping the wording uniform costs nothing.
                throw new ClientException(HttpStatus.BAD_REQUEST,
                        "That is not your current password.");
            }
        }

        profile.setPassword(passwordEncoder.encode(newPassword));
        profile.setPasswordSet(true);
        userProfileRepository.save(profile);
    }


    /**
     * The story rail: a slice of profiles that rotates once a day.
     *
     * The rail used to be the first twelve rows of the feed, which meant it
     * showed the twelve newest members and nothing else - the same faces every
     * day, and a profile created a month ago could never appear in it no matter
     * what. This walks a window through the whole eligible list instead, so
     * every profile gets its turn and the rail is different tomorrow.
     *
     * Deterministic rather than random, and that is the point:
     *
     *  - Everyone opening the app on the same day sees the same rotation, so it
     *    behaves like an editorial "today's profiles" rather than noise.
     *  - It survives a restart and needs no stored cursor, no scheduled job and
     *    no extra table - the date IS the cursor.
     *  - Advancing by the window size means consecutive days do not overlap, so
     *    a member who opens the app daily keeps seeing new faces until the list
     *    wraps.
     *
     * Asia/Kolkata, not the server's zone, because "today" has to turn over at
     * midnight for the members rather than at 05:30 because a machine happens to
     * run in UTC.
     *
     * @param size how many to return; the whole eligible list if it is smaller.
     */
    @Override
    public List<UserDto> storiesOfTheDay(String userName, int size) {
        if (size <= 0) {
            return List.of();
        }

        Optional<UserProfile> me = userProfileRepository.findByEmail(userName);
        if (me.isEmpty()) {
            return List.of();
        }

        // Null means "do not filter" - same contract as the feed, so a member
        // who has not recorded a gender gets a populated rail rather than none.
        String lookingFor = oppositeGenderOf(me.get().getGender());
        List<Integer> candidates =
                userProfileRepository.findStoryCandidateIds(me.get().getId(), lookingFor);

        if (candidates.isEmpty()) {
            return List.of();
        }

        int total = candidates.size();
        int take = Math.min(size, total);
        long day = LocalDate.now(ZoneId.of("Asia/Kolkata")).toEpochDay();
        // floorMod, not %, because epoch day is negative before 1970 and a
        // negative index would throw rather than wrap.
        int offset = (int) Math.floorMod(day * (long) take, (long) total);

        List<Integer> window = new ArrayList<>(take);
        for (int i = 0; i < take; i++) {
            window.add(candidates.get((offset + i) % total));
        }

        // findAllById returns rows in whatever order the database likes, so the
        // window order is reapplied afterwards - otherwise the rotation would
        // still pick the right profiles and then show them in a jumbled order
        // that changes between calls.
        Map<Integer, UserProfile> byId = userProfileRepository.findAllById(window).stream()
                .collect(Collectors.toMap(UserProfile::getId, Function.identity()));

        return window.stream()
                .map(byId::get)
                .filter(Objects::nonNull)
                .map(userProfileMapper::toUserDto)
                .toList();
    }

}
