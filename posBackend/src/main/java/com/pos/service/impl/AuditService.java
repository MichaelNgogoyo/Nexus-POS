package com.pos.service.impl;

import com.pos.model.AuditLog;
import com.pos.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository repo;

    public void log(String actor, String action, String entityType,
                    String entityId, String before, String after) {
        repo.save(AuditLog.builder()
                .actor(actor)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .beforeValue(before)
                .afterValue(after)
                .build());
    }
}
