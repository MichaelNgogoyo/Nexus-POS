package com.pos.repository;

import com.pos.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findAllByOrderByTimestampDesc(Pageable pageable);
    Page<AuditLog> findByActorContainingIgnoreCaseOrActionContainingIgnoreCase(
            String actor, String action, Pageable pageable);
}
