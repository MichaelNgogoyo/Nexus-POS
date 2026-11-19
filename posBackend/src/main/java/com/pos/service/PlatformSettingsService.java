package com.pos.service;

import com.pos.dto.PlatformSettingsRequest;
import com.pos.dto.PlatformSettingsResponse;
import com.pos.model.PlatformSettings;
import com.pos.repository.PlatformSettingsRepository;
import com.pos.model.AuditLog;
import com.pos.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
public class PlatformSettingsService {
    private final PlatformSettingsRepository repository;
    private final AuditLogRepository auditLogRepository;

    @Transactional(readOnly = true)
    public PlatformSettingsResponse get() {
        return response(repository.findById((short) 1).orElseGet(PlatformSettings::new));
    }

    @Transactional
    public PlatformSettingsResponse update(PlatformSettingsRequest request, String actor) {
        PlatformSettings settings = repository.findById((short) 1).orElseGet(PlatformSettings::new);
        String before = settings.getDefaultThemePreset() + "/" + settings.getDefaultThemeMode();
        settings.setDefaultThemePreset(request.defaultThemePreset());
        settings.setDefaultThemeMode(request.defaultThemeMode());
        settings.setUpdatedBy(actor);
        settings.setUpdatedAt(OffsetDateTime.now());
        PlatformSettingsResponse saved = response(repository.save(settings));
        auditLogRepository.save(AuditLog.builder()
                .actor(actor)
                .action("PLATFORM_SETTINGS_UPDATED")
                .entityType("PlatformSettings")
                .entityId("1")
                .beforeValue(before)
                .afterValue(request.defaultThemePreset() + "/" + request.defaultThemeMode())
                .build());
        return saved;
    }

    private PlatformSettingsResponse response(PlatformSettings settings) {
        return new PlatformSettingsResponse(settings.getDefaultThemePreset(), settings.getDefaultThemeMode(),
                settings.getUpdatedBy(), settings.getUpdatedAt());
    }
}
