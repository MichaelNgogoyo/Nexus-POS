package com.pos.controller;

import com.pos.model.AuditLog;
import com.pos.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    @GetMapping
    public Page<AuditLog> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String q) {

        Pageable pageable = PageRequest.of(page, size);
        if (q != null && !q.isBlank()) {
            return auditLogRepository
                    .findByActorContainingIgnoreCaseOrActionContainingIgnoreCase(q, q, pageable);
        }
        return auditLogRepository.findAllByOrderByTimestampDesc(pageable);
    }
}
