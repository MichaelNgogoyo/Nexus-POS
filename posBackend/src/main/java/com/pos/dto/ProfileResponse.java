package com.pos.dto;

public record ProfileResponse(String subject, String username, String email, boolean hasAvatar,
                              String themePreset, String themeMode) {
}
