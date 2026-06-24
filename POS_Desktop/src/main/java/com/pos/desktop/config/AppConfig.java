package com.pos.desktop.config;

import java.io.IOException;
import java.io.InputStream;
import java.util.Objects;
import java.util.Properties;

public final class AppConfig {
    private final String apiBaseUrl;
    private final String healthUrl;
    private final String localDbPath;
    private final int syncIntervalSeconds;
    private final int syncBatchSize;
    private final String keycloakTokenEndpoint;
    private final String keycloakUserinfoEndpoint;
    private final String keycloakClientId;
    private final String keycloakClientSecret;

    private AppConfig(String apiBaseUrl,
                      String healthUrl,
                      String localDbPath,
                      int syncIntervalSeconds,
                      int syncBatchSize,
                      String keycloakTokenEndpoint,
                      String keycloakUserinfoEndpoint,
                      String keycloakClientId,
                      String keycloakClientSecret) {
        this.apiBaseUrl = apiBaseUrl;
        this.healthUrl = healthUrl;
        this.localDbPath = localDbPath;
        this.syncIntervalSeconds = syncIntervalSeconds;
        this.syncBatchSize = syncBatchSize;
        this.keycloakTokenEndpoint = keycloakTokenEndpoint;
        this.keycloakUserinfoEndpoint = keycloakUserinfoEndpoint;
        this.keycloakClientId = keycloakClientId;
        this.keycloakClientSecret = keycloakClientSecret;
    }

    public static AppConfig fromProperties() {
        Properties props = new Properties();
        try (InputStream in = AppConfig.class.getClassLoader().getResourceAsStream("application.properties")) {
            if (in != null) {
                props.load(in);
            }
        } catch (IOException e) {
            throw new IllegalStateException("Unable to load application.properties", e);
        }

        String baseUrl = props.getProperty("app.api.baseUrl", "http://localhost:8080/api").trim();
        String health = props.getProperty("app.api.healthUrl", baseUrl + "/actuator/health").trim();
        String dbPath = props.getProperty("app.local.db", "./data/pos-desktop.db").trim();
        int syncInterval = Integer.parseInt(props.getProperty("app.sync.interval.seconds", "30"));
        int batchSize = Integer.parseInt(props.getProperty("app.sync.batchSize", "100"));

        String tokenEndpoint = props.getProperty("keycloak.tokenEndpoint", "").trim();
        String userinfoEndpoint = props.getProperty("keycloak.userinfoEndpoint", "").trim();
        String clientId = props.getProperty("keycloak.clientId", "").trim();
        String clientSecret = props.getProperty("keycloak.clientSecret", "").trim();

        return new AppConfig(baseUrl, health, dbPath, syncInterval, batchSize, tokenEndpoint, userinfoEndpoint, clientId, clientSecret);
    }

    public String getApiBaseUrl() {
        return apiBaseUrl;
    }

    public String getHealthUrl() {
        return healthUrl;
    }

    public String getLocalDbPath() {
        return localDbPath;
    }

    public int getSyncIntervalSeconds() {
        return syncIntervalSeconds;
    }

    public int getSyncBatchSize() {
        return syncBatchSize;
    }

    public String getKeycloakTokenEndpoint() {
        return keycloakTokenEndpoint;
    }

    public String getKeycloakUserinfoEndpoint() {
        return keycloakUserinfoEndpoint;
    }

    public String getKeycloakClientId() {
        return keycloakClientId;
    }

    public String getKeycloakClientSecret() {
        return keycloakClientSecret;
    }

    @Override
    public String toString() {
        return "AppConfig{" +
                "apiBaseUrl='" + apiBaseUrl + '\'' +
                ", healthUrl='" + healthUrl + '\'' +
                ", localDbPath='" + localDbPath + '\'' +
                ", syncIntervalSeconds=" + syncIntervalSeconds +
                ", syncBatchSize=" + syncBatchSize +
                ", keycloakTokenEndpoint='" + keycloakTokenEndpoint + '\'' +
                ", keycloakUserinfoEndpoint='" + keycloakUserinfoEndpoint + '\'' +
                ", keycloakClientId='" + keycloakClientId + '\'' +
                ", keycloakClientSecret='***'" +
                '}';
    }

    @Override
    public int hashCode() {
        return Objects.hash(apiBaseUrl, healthUrl, localDbPath, syncIntervalSeconds, syncBatchSize, keycloakTokenEndpoint, keycloakUserinfoEndpoint, keycloakClientId, keycloakClientSecret);
    }
}
