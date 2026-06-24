package com.pos.desktop.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.pos.desktop.config.AppConfig;
import com.pos.desktop.core.LocalEntityStore;
import com.pos.desktop.core.NetworkClient;
import com.pos.desktop.core.SyncQueueStore;
import com.pos.desktop.model.EntityType;
import com.pos.desktop.model.OperationType;
import com.pos.desktop.model.UserAccount;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Optional;

public class AuthService {
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final NetworkClient networkClient;
    private final SessionStore sessionStore;
    private final LocalEntityStore entityStore;
    private final SyncQueueStore queueStore;
    private final AppConfig config;
    private final ObjectMapper mapper;

    public AuthService(NetworkClient networkClient, SessionStore sessionStore, LocalEntityStore entityStore, SyncQueueStore queueStore, AppConfig config) {
        this.networkClient = networkClient;
        this.sessionStore = sessionStore;
        this.entityStore = entityStore;
        this.queueStore = queueStore;
        this.config = config;
        this.mapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    public boolean login(String username, String password) {
        if (networkClient.isOnline()) {
            return passwordGrant(username, password);
        }

        // Offline: reuse cached token if not expired
        if (sessionStore.token().isPresent() && sessionStore.expiresAtEpochSeconds() > Instant.now().getEpochSecond()) {
            return true;
        }
        log.warn("Offline login denied; no cached token available");
        return false;
    }

    private boolean passwordGrant(String username, String password) {
        if (config.getKeycloakTokenEndpoint().isBlank()) {
            log.error("Keycloak token endpoint is not configured");
            return false;
        }

        StringBuilder form = new StringBuilder();
        form.append("grant_type=password")
                .append("&client_id=").append(encode(config.getKeycloakClientId()))
                .append("&username=").append(encode(username))
                .append("&password=").append(encode(password));
        if (!config.getKeycloakClientSecret().isBlank()) {
            form.append("&client_secret=").append(encode(config.getKeycloakClientSecret()));
        }

        Optional<String> response = networkClient.postForm(config.getKeycloakTokenEndpoint(), form.toString());
        if (response.isEmpty()) {
            return false;
        }
        try {
            JsonNode json = mapper.readTree(response.get());
            String accessToken = json.path("access_token").asText(null);
            String refreshToken = json.path("refresh_token").asText(null);
            long expiresIn = json.path("expires_in").asLong(0);
            if (accessToken == null) {
                log.error("Keycloak response missing access_token");
                return false;
            }

            UserAccount account = fetchUser(accessToken, username);
            sessionStore.setSession(accessToken, refreshToken, Instant.now().plusSeconds(Math.max(30, expiresIn)).getEpochSecond(), account);
            entityStore.upsert(EntityType.USER, account.id(), account, false);
            return true;
        } catch (Exception e) {
            log.error("Failed to parse Keycloak token response", e);
            return false;
        }
    }

    private UserAccount fetchUser(String accessToken, String fallbackUsername) {
        try {
            if (config.getKeycloakUserinfoEndpoint() != null && !config.getKeycloakUserinfoEndpoint().isBlank()) {
                Optional<String> userinfo = networkClient.get(config.getKeycloakUserinfoEndpoint(), Optional.of(accessToken));
                if (userinfo.isPresent()) {
                    JsonNode node = mapper.readTree(userinfo.get());
                    String sub = node.path("sub").asText(fallbackUsername);
                    String preferred = node.path("preferred_username").asText(fallbackUsername);
                    String name = node.path("name").asText(preferred);
                    boolean active = node.path("email_verified").asBoolean(true);
                    return new UserAccount(sub, preferred, name, active, java.time.LocalDateTime.now());
                }
            }
        } catch (Exception e) {
            log.warn("Failed to fetch userinfo; using fallback username", e);
        }
        return new UserAccount(fallbackUsername, fallbackUsername, "USER", true, java.time.LocalDateTime.now());
    }

    private String encode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    public void logout() {
        sessionStore.clear();
    }

    public void cacheUser(UserAccount account) {
        entityStore.upsert(EntityType.USER, account.id(), account, false);
        queueStore.enqueue(EntityType.USER, account.id(), OperationType.UPSERT, account);
    }
}
