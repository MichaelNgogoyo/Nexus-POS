package com.pos.service;

import com.pos.dto.AppearanceSettingsRequest;
import com.pos.dto.ProfileResponse;
import com.pos.model.PlatformSettings;
import com.pos.model.StaffProfile;
import com.pos.repository.PlatformSettingsRepository;
import com.pos.repository.StaffProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StaffProfileService {
    private static final long MAX_AVATAR_BYTES = 2 * 1024 * 1024;
    private final StaffProfileRepository profiles;
    private final PlatformSettingsRepository platformSettings;
    private final MinIOService minIOService;

    @Transactional(readOnly = true)
    public ProfileResponse get(String subject, String username, String email) {
        StaffProfile profile = profiles.findById(subject).orElse(null);
        PlatformSettings defaults = platformSettings.findById((short) 1).orElse(null);
        return new ProfileResponse(subject, username, email, profile != null && profile.getAvatarKey() != null,
                profile != null ? profile.getThemePreset() : defaults == null ? "apple" : defaults.getDefaultThemePreset(),
                profile != null ? profile.getThemeMode() : defaults == null ? "light" : defaults.getDefaultThemeMode());
    }

    @Transactional
    public ProfileResponse saveAppearance(String subject, String username, String email, AppearanceSettingsRequest request) {
        StaffProfile profile = profiles.findById(subject).orElseGet(() -> {
            StaffProfile created = new StaffProfile();
            created.setSubject(subject);
            return created;
        });
        profile.setThemePreset(request.preset());
        profile.setThemeMode(request.mode());
        profile.setUpdatedAt(OffsetDateTime.now());
        profiles.save(profile);
        return get(subject, username, email);
    }

    @Transactional
    public void saveAvatar(String subject, MultipartFile file) throws Exception {
        if (file == null || file.isEmpty() || file.getSize() > MAX_AVATAR_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose an image smaller than 2 MB.");
        }
        byte[] bytes = file.getBytes();
        java.awt.image.BufferedImage image;
        try {
            image = ImageIO.read(new ByteArrayInputStream(bytes));
        } catch (Exception invalidImage) {
            image = null;
        }
        if (image == null || image.getWidth() > 2048 || image.getHeight() > 2048
                || (long) image.getWidth() * image.getHeight() > 4_000_000) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Only valid PNG and JPEG images are supported.");
        }
        String type = detectImageType(bytes);
        if (type == null) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Only valid PNG and JPEG images are supported.");
        }

        String key = "staff-profiles/" + subjectKey(subject) + "/" + UUID.randomUUID() + (type.equals("image/png") ? ".png" : ".jpg");
        minIOService.uploadFile(key, file, type);
        StaffProfile profile = profiles.findById(subject).orElseGet(() -> {
            StaffProfile created = new StaffProfile();
            created.setSubject(subject);
            return created;
        });
        String oldKey = profile.getAvatarKey();
        profile.setAvatarKey(key);
        profile.setAvatarContentType(type);
        profile.setUpdatedAt(OffsetDateTime.now());
        profiles.save(profile);
        if (oldKey != null && !oldKey.equals(key)) minIOService.deleteFile(oldKey);
    }

    @Transactional(readOnly = true)
    public Avatar getAvatar(String subject) throws Exception {
        StaffProfile profile = profiles.findById(subject).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (profile.getAvatarKey() == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return new Avatar(minIOService.getFile(profile.getAvatarKey()), profile.getAvatarContentType());
    }

    @Transactional
    public void deleteAvatar(String subject) throws Exception {
        StaffProfile profile = profiles.findById(subject).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (profile.getAvatarKey() != null) minIOService.deleteFile(profile.getAvatarKey());
        profile.setAvatarKey(null);
        profile.setAvatarContentType(null);
        profile.setUpdatedAt(OffsetDateTime.now());
    }

    private String subjectKey(String subject) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(subject.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(digest, 0, 16);
    }

    private String detectImageType(byte[] bytes) {
        if (bytes.length >= 8 && bytes[0] == (byte) 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4e && bytes[3] == 0x47) return "image/png";
        if (bytes.length >= 3 && bytes[0] == (byte) 0xff && bytes[1] == (byte) 0xd8 && bytes[2] == (byte) 0xff) return "image/jpeg";
        return null;
    }

    public record Avatar(byte[] bytes, String contentType) { }
}
