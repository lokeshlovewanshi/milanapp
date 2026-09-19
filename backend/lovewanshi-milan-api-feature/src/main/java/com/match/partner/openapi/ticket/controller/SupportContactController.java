package com.match.partner.openapi.ticket.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * The phone number and email address shown on Help &amp; Support.
 *
 * These were constants in the app, which meant changing the support number
 * required a Play Store release and a wait for members to update - and until
 * they did, some of them would be calling a number nobody answers. Serving
 * them from here makes it a config change and a restart.
 *
 * Defaults match what the app shipped with, so an older build and a new one
 * agree, and a server with nothing configured still shows something real
 * rather than an empty row.
 */
@RestController
@RequestMapping("/api/v1")
public class SupportContactController {

    @Value("${support.contact.phone:7440814972}")
    private String phone;

    @Value("${support.contact.email:lovewanshisamaj@gmail.com}")
    private String email;

    /**
     * Deliberately unauthenticated: it is the number already printed on the
     * Play Store listing and the website, and someone locked out of their
     * account is exactly who needs it most.
     */
    @GetMapping("/support/contact")
    public Map<String, String> contact() {
        return Map.of("phone", phone, "email", email);
    }
}
