package com.pos.desktop.auth;

import com.pos.desktop.model.UserAccount;

import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

public class SessionStore {
    private final AtomicReference<String> token = new AtomicReference<>();
    private final AtomicReference<String> refreshToken = new AtomicReference<>();
    private final AtomicLong expiresAtEpochSeconds = new AtomicLong(0);
    private final AtomicReference<UserAccount> user = new AtomicReference<>();

    public void setSession(String bearerToken, String refresh, long expiresAtSeconds, UserAccount account) {
        token.set(bearerToken);
        refreshToken.set(refresh);
        expiresAtEpochSeconds.set(expiresAtSeconds);
        user.set(account);
    }

    public Optional<String> token() {
        return Optional.ofNullable(token.get());
    }

    public Optional<String> refreshToken() {
        return Optional.ofNullable(refreshToken.get());
    }

    public long expiresAtEpochSeconds() {
        return expiresAtEpochSeconds.get();
    }

    public Optional<UserAccount> user() {
        return Optional.ofNullable(user.get());
    }

    public void clear() {
        token.set(null);
        refreshToken.set(null);
        expiresAtEpochSeconds.set(0);
        user.set(null);
    }
}
