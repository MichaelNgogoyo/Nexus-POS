package com.pos.desktop.model;

import java.time.LocalDateTime;

public record UserAccount(String id, String username, String role, boolean active, LocalDateTime updatedAt) {
}
