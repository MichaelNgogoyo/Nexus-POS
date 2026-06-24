package com.pos.desktop.core;

import com.pos.desktop.config.AppConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Optional;

public class NetworkClient {
    private static final Logger log = LoggerFactory.getLogger(NetworkClient.class);

    private final AppConfig config;
    private final HttpClient client;

    public NetworkClient(AppConfig config) {
        this.config = config;
        this.client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    public boolean isOnline() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(config.getHealthUrl()))
                    .timeout(Duration.ofSeconds(3))
                    .GET()
                    .build();
            HttpResponse<Void> response = client.send(request, HttpResponse.BodyHandlers.discarding());
            return response.statusCode() < 500;
        } catch (Exception e) {
            log.warn("Health check failed: {}", e.getMessage());
            return false;
        }
    }

    public Optional<String> get(String path, Optional<String> bearerToken) {
        return send(bodyless("GET", path, bearerToken));
    }

    public Optional<String> postJson(String path, String payload, Optional<String> bearerToken) {
        return send(withBody("POST", path, payload, bearerToken));
    }

    public Optional<String> postForm(String url, String formBody) {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(resolve(url))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(formBody))
                .build();
        return send(request);
    }

    public Optional<String> putJson(String path, String payload, Optional<String> bearerToken) {
        return send(withBody("PUT", path, payload, bearerToken));
    }

    public Optional<String> delete(String path, Optional<String> bearerToken) {
        return send(bodyless("DELETE", path, bearerToken));
    }

    public Optional<byte[]> getBytes(String path, Optional<String> bearerToken) {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(resolve(path))
                .timeout(Duration.ofSeconds(15));
        bearerToken.ifPresent(token -> builder.header("Authorization", "Bearer " + token));
        HttpRequest request = builder.GET().build();
        try {
            HttpResponse<byte[]> response = client.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return Optional.ofNullable(response.body());
            }
            log.warn("Request to {} failed with status {}", request.uri(), response.statusCode());
            return Optional.empty();
        } catch (IOException | InterruptedException e) {
            log.warn("Network request failed: {}", e.getMessage());
            Thread.currentThread().interrupt();
            return Optional.empty();
        }
    }

    private Optional<String> send(HttpRequest request) {
        try {
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return Optional.ofNullable(response.body());
            }
            log.warn("Request to {} failed with status {}", request.uri(), response.statusCode());
            return Optional.empty();
        } catch (IOException | InterruptedException e) {
            log.warn("Network request failed: {}", e.getMessage());
            Thread.currentThread().interrupt();
            return Optional.empty();
        }
    }

    private HttpRequest bodyless(String method, String path, Optional<String> bearerToken) {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(resolve(path))
                .timeout(Duration.ofSeconds(10));
        bearerToken.ifPresent(token -> builder.header("Authorization", "Bearer " + token));
        return builder.method(method, HttpRequest.BodyPublishers.noBody()).build();
    }

    private HttpRequest withBody(String method, String path, String payload, Optional<String> bearerToken) {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(resolve(path))
                .timeout(Duration.ofSeconds(10))
                .header("Content-Type", "application/json")
                .method(method, HttpRequest.BodyPublishers.ofString(payload));
        bearerToken.ifPresent(token -> builder.header("Authorization", "Bearer " + token));
        return builder.build();
    }

    private URI resolve(String path) {
        if (path.startsWith("http://") || path.startsWith("https://")) {
            return URI.create(path);
        }
        String normalized = path.startsWith("/") ? path : "/" + path;
        return URI.create(config.getApiBaseUrl() + normalized);
    }
}
