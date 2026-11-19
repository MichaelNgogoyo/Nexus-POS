package com.pos.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "staff_profiles")
@Getter
@Setter
@NoArgsConstructor
public class StaffProfile {
    @Id
    @Column(length = 128)
    private String subject;

    @Column(name = "avatar_key", length = 512)
    private String avatarKey;

    @Column(name = "avatar_content_type", length = 64)
    private String avatarContentType;

    @Column(name = "theme_preset", nullable = false, length = 32)
    private String themePreset = "apple";

    @Column(name = "theme_mode", nullable = false, length = 16)
    private String themeMode = "light";

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();
}
