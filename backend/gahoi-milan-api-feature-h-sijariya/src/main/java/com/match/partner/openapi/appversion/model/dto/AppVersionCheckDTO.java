package com.match.partner.openapi.appversion.model.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * The answer to "should this app nag the member to update".
 *
 * updateAvailable and forceUpdate are computed here, from the caller's own
 * version_code, rather than left for the app to work out from raw numbers -
 * the "is my version too old" comparison should exist in exactly one place,
 * and a client that got the arithmetic wrong would either nag nobody or block
 * everybody.
 */
@Data
@NoArgsConstructor
public class AppVersionCheckDTO {
    private boolean updateAvailable;
    private boolean forceUpdate;
    private Integer latestVersionCode;
    private String latestVersionName;
    private String releaseNotes;
    private String downloadUrl;
}
