package com.pos.service;

import com.pos.model.RestaurantTable;
import com.pos.model.TableStatus;
import com.pos.repository.RestaurantTableRepository;
import com.pos.service.impl.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class TableService {

    private final RestaurantTableRepository tableRepository;
    private final AuditService auditService;

    @Transactional
    public RestaurantTable updateStatus(Long id, String requestedStatus, String actor) {
        if (requestedStatus == null || requestedStatus.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Table status is required");
        }

        TableStatus next;
        try {
            next = TableStatus.valueOf(requestedStatus.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown table status");
        }

        RestaurantTable table = tableRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Table not found"));
        TableStatus previous = table.getStatus();
        if (previous == next) return table;

        table.setStatus(next);
        table.setOccupiedAt(next == TableStatus.OCCUPIED ? LocalDateTime.now() : null);
        RestaurantTable saved = tableRepository.save(table);
        auditService.log(actor, "TABLE_STATUS_CHANGED", "RestaurantTable", id.toString(),
                previous == null ? null : previous.name(), next.name());
        return saved;
    }
}
