package com.pos.controller;

import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

import static org.assertj.core.api.Assertions.assertThat;

class PlatformSettingsControllerAuthorizationTest {
    @Test
    void platformSettingsAreRestrictedToSuperAdminsAtTheControllerBoundary() {
        PreAuthorize authorization = PlatformSettingsController.class.getAnnotation(PreAuthorize.class);
        assertThat(authorization).isNotNull();
        assertThat(authorization.value()).isEqualTo("hasRole('SUPER_ADMIN')");
    }
}
