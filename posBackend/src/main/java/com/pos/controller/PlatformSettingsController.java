package com.pos.controller;

import com.pos.dto.PlatformSettingsRequest;
import com.pos.dto.PlatformSettingsResponse;
import com.pos.service.PlatformSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/platform/settings")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class PlatformSettingsController {
    private final PlatformSettingsService service;

    @GetMapping
    public PlatformSettingsResponse get() {
        return service.get();
    }

    @PutMapping
    public PlatformSettingsResponse update(@Valid @RequestBody PlatformSettingsRequest request, @AuthenticationPrincipal Jwt jwt) {
        String actor = jwt.getClaimAsString("preferred_username");
        return service.update(request, actor == null || actor.isBlank() ? jwt.getSubject() : actor);
    }
}
