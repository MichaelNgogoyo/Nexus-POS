package com.pos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record AppearanceSettingsRequest(
        @NotBlank @Pattern(regexp = "apple|executive|charcoal|emerald|sapphire|platinum") String preset,
        @NotBlank @Pattern(regexp = "light|dark") String mode
) {
}
