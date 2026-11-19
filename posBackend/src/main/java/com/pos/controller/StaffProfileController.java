package com.pos.controller;

import com.pos.dto.AppearanceSettingsRequest;
import com.pos.dto.ProfileResponse;
import com.pos.service.StaffProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/me/profile")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class StaffProfileController {
    private final StaffProfileService service;

    @GetMapping
    public ProfileResponse get(@AuthenticationPrincipal Jwt jwt) {
        return service.get(jwt.getSubject(), jwt.getClaimAsString("preferred_username"), jwt.getClaimAsString("email"));
    }

    @PutMapping("/appearance")
    public ProfileResponse appearance(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody AppearanceSettingsRequest request) {
        return service.saveAppearance(jwt.getSubject(), jwt.getClaimAsString("preferred_username"), jwt.getClaimAsString("email"), request);
    }

    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> uploadAvatar(@AuthenticationPrincipal Jwt jwt, @RequestParam("file") MultipartFile file) throws Exception {
        service.saveAvatar(jwt.getSubject(), file);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/avatar")
    public ResponseEntity<byte[]> avatar(@AuthenticationPrincipal Jwt jwt) throws Exception {
        StaffProfileService.Avatar avatar = service.getAvatar(jwt.getSubject());
        MediaType contentType = MediaType.parseMediaType(avatar.contentType());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("X-Content-Type-Options", "nosniff")
                .contentType(contentType).body(avatar.bytes());
    }

    @DeleteMapping("/avatar")
    public ResponseEntity<Void> deleteAvatar(@AuthenticationPrincipal Jwt jwt) throws Exception {
        service.deleteAvatar(jwt.getSubject());
        return ResponseEntity.noContent().build();
    }
}
