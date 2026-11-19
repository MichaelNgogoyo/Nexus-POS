package com.pos.dto;

import java.time.OffsetDateTime;

public record PlatformSettingsResponse(String defaultThemePreset, String defaultThemeMode,
                                        String updatedBy, OffsetDateTime updatedAt) {
}
