package com.pos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record PlatformSettingsRequest(
        @NotBlank @Pattern(regexp = "apple|executive|charcoal|emerald|sapphire|platinum") String defaultThemePreset,
        @NotBlank @Pattern(regexp = "light|dark") String defaultThemeMode
) {
}
