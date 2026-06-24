package com.pos.desktop.model;

import java.time.LocalDateTime;

public record SyncJob(long id, EntityType entityType, String entityId, OperationType operation, String payload, LocalDateTime createdAt, int attempts) {
}
