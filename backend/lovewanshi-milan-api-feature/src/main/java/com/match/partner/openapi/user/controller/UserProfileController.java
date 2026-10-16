package com.match.partner.openapi.user.controller;

import com.match.partner.common.Utils.CommonUtils;
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
import com.fasterxml.jackson.databind.JsonNode;
import com.match.partner.openapi.user.service.BiodataService;
import com.match.partner.openapi.user.service.KundaliService;
import com.match.partner.openapi.user.service.UserProfileServiceInterface;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class UserProfileController {

    @Autowired
    private UserProfileServiceInterface userProfileService;

    @Autowired
    private CommonUtils commonUtils;

    @Autowired
    private KundaliService kundaliService;

    @Autowired
    private BiodataService biodataService;

    /**
     * The caller's own biodata sheet, as a print-ready HTML page.
     *
     * HTML rather than a PDF built here: the client turns it into a PDF with
     * its own renderer, which keeps a layout engine off this instance and
     * renders the Devanagari and the chart SVG correctly. See BiodataService.
     */
    @GetMapping(value = "/user/biodata", produces = MediaType.TEXT_HTML_VALUE)
    public String biodata(@RequestAttribute("username") String userName) {
        return biodataService.renderForUser(userName);
    }

    @GetMapping("/user")
    public UserProfileDTO getUser(@RequestAttribute("username") String userName){
        return  userProfileService.getUser(userName);
    }

    /**
     * @param oppositeGender the browse feed passes true so a man is shown women
     *                       and a woman men. Defaults to false, which keeps
     *                       "see all profiles" - and any existing client that
     *                       has not been updated - listing everyone.
     */
    /**
     * Profiles for the story rail - a slice that rotates once a day.
     *
     * Separate from /users rather than a flag on it because it is not a page of
     * the feed: it is a fixed-size window that moves on its own schedule, and
     * paging it would mean nothing.
     *
     * @param size capped at 20. The rail is a glance, and each entry costs a
     *             presigned S3 URL to build.
     */
    @GetMapping("/user/stories")
    public List<UserDto> getStories(@RequestAttribute("username") String userName,
                                    @RequestParam(defaultValue = "12") int size) {
        return userProfileService.storiesOfTheDay(userName, Math.min(size, 20));
    }

    /**
     * @param ageFrom, ageTo, maritalStatus, manglik, profession, heightFrom, heightTo
     *                 the "See all profiles" filter bar. All optional; an
     *                 omitted one is not filtered on. maritalStatus, manglik
     *                 and height are lookup codes (NEVER_MARRIED, YES, H_60,
     *                 ...) - the same codes /reference/options returns - not
     *                 display labels.
     */
    @GetMapping("/users")
    public Page<UserDto> getUsers(@RequestAttribute("username") String userName,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "10") int size,
                                  @RequestParam(defaultValue = "false") boolean oppositeGender,
                                  @RequestParam(required = false) Integer ageFrom,
                                  @RequestParam(required = false) Integer ageTo,
                                  @RequestParam(required = false) String maritalStatus,
                                  @RequestParam(required = false) String manglik,
                                  @RequestParam(required = false) String profession,
                                  @RequestParam(required = false) String heightFrom,
                                  @RequestParam(required = false) String heightTo) {
        ProfileFilter filter = new ProfileFilter(
                ageFrom, ageTo, maritalStatus, profession, manglik, heightFrom, heightTo);
        return userProfileService.getUsers(page, size, userName, oppositeGender, filter);
    }

    /**
     * Hide or unhide your own profile.
     *
     * The subject is always the caller, taken from the JWT - there is no id in
     * the path, so there is nothing to swap for someone else's.
     */
    /**
     * Set or change your own password.
     *
     * Reads the target from the session rather than the path, so there is no id
     * to swap for someone else's - same reasoning as visibility below.
     *
     * @param request currentPassword may be omitted by an account created
     *                through Google sign-in that never had one. Whether it is
     *                actually required is decided by the server from the stored
     *                flag, never from whether the client bothered to send it.
     */
    @PatchMapping("/user/password")
    public ResponseEntity<Void> changePassword(@RequestAttribute("username") String userName,
                                               @RequestBody ChangePasswordRequest request) {
        userProfileService.changePassword(userName, request.currentPassword(), request.newPassword());
        return ResponseEntity.noContent().build();
    }

    public record ChangePasswordRequest(String currentPassword, String newPassword) {}

    @PatchMapping("/user/profile/visibility")
    public ResponseEntity<Void> setVisibility(@RequestAttribute("username") String userName,
                                              @RequestBody VisibilityRequest request) {
        userProfileService.setProfileHidden(userName, request.hidden());
        return ResponseEntity.noContent().build();
    }

    /**
     * Delete your own profile. Soft delete - see the service for why the row
     * has to survive.
     */
    @DeleteMapping("/user/profile")
    public ResponseEntity<Void> deleteOwnProfile(@RequestAttribute("username") String userName) {
        userProfileService.deleteOwnProfile(userName);
        return ResponseEntity.noContent().build();
    }

    /** Body of {@link #setVisibility}. */
    public record VisibilityRequest(boolean hidden) {}

    /**
     * Generate the caller's own birth chart.
     *
     * Takes no body: the birth date, time and place come from the caller's
     * profile, keyed off the JWT. A member therefore cannot generate a chart
     * for anyone but themselves, and cannot feed the service values that are
     * not already on their own record.
     */
    @GetMapping("/user/kundali")
    public JsonNode getKundali(@RequestAttribute("username") String userName) {
        return kundaliService.getOrGenerate(userName, false);
    }

    /**
     * Regenerate. POST rather than GET because it is not idempotent - it
     * spends a Lambda invocation and replaces what is stored.
     */
    @PostMapping("/user/kundali")
    public JsonNode regenerateKundali(@RequestAttribute("username") String userName) {
        return kundaliService.getOrGenerate(userName, true);
    }

    /**
     * Ashtakoota score between the caller and another member.
     *
     * The caller is always one side, taken from the JWT, so this cannot be used
     * to match two arbitrary strangers against each other.
     */
    @GetMapping("/user/kundali/match/{id}")
    public JsonNode matchKundali(@RequestAttribute("username") String userName,
                                 @PathVariable("id") String id) {
        return kundaliService.match(userName, commonUtils.convertFromJMFormat(id));
    }

    @GetMapping("/users/{id}")
    public UserProfileDTO getUserById(@RequestAttribute(value = "username", required = false) String userName,
                                      @PathVariable("id") String id) {
        return userProfileService.getUsers(commonUtils.convertFromJMFormat(id), userName);
    }

    @PatchMapping("/user/profile")
    public ResponseEntity<UserProfile> updateUserProfile(@RequestBody UserProfileDTO userProfileDTO,
                                                         @RequestAttribute("username") String userName) {
        userProfileService.updateUserProfile(userProfileDTO, userName);

        return null;
    }

    @PostMapping("/user/profile")
    public ResponseEntity<UserProfile> createUserProfile(@RequestBody ProfileRegistrationDto userProfileDTO,
                                                         @RequestAttribute("username") String userName) {
        userProfileService.registerProfile(userProfileDTO, userName);
        return null;
    }

    // Split GET Endpoints

    @GetMapping("/user/profile/basic")
    public BasicInfoDTO getBasicInfo(@RequestAttribute("username") String userName) {
        return userProfileService.getBasicInfo(userName);
    }

    @GetMapping("/user/profile/contact")
    public ContactInfoDTO getContactInfo(@RequestAttribute("username") String userName) {
        return userProfileService.getContactInfo(userName);
    }

    @GetMapping("/user/profile/religion")
    public ReligionInfoDTO getReligionInfo(@RequestAttribute("username") String userName) {
        return userProfileService.getReligionInfo(userName);
    }

    @GetMapping("/user/profile/education")
    public EducationInfoDTO getEducationInfo(@RequestAttribute("username") String userName) {
        return userProfileService.getEducationInfo(userName);
    }

    @GetMapping("/user/profile/family")
    public FamilyInfoDTO getFamilyInfo(@RequestAttribute("username") String userName) {
        return userProfileService.getFamilyInfo(userName);
    }

    // Split PATCH Endpoints

    @PatchMapping("/user/profile/basic")
    public ResponseEntity<Void> updateBasicInfo(@RequestBody BasicInfoDTO dto,
                                                @RequestAttribute("username") String userName) {
        userProfileService.updateBasicInfo(dto, userName);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/user/profile/contact")
    public ResponseEntity<Void> updateContactInfo(@RequestBody ContactInfoDTO dto,
                                                  @RequestAttribute("username") String userName) {
        userProfileService.updateContactInfo(dto, userName);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/user/profile/religion")
    public ResponseEntity<Void> updateReligionInfo(@RequestBody ReligionInfoDTO dto,
                                                   @RequestAttribute("username") String userName) {
        userProfileService.updateReligionInfo(dto, userName);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/user/profile/education")
    public ResponseEntity<Void> updateEducationInfo(@RequestBody EducationInfoDTO dto,
                                                    @RequestAttribute("username") String userName) {
        userProfileService.updateEducationInfo(dto, userName);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/user/profile/family")
    public ResponseEntity<Void> updateFamilyInfo(@RequestBody FamilyInfoDTO dto,
                                                 @RequestAttribute("username") String userName) {
        userProfileService.updateFamilyInfo(dto, userName);
        return ResponseEntity.ok().build();
    }
}