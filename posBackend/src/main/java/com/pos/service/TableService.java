package com.pos.service;

import com.pos.model.RestaurantTable;
import com.pos.model.OrderStatus;
import com.pos.model.TableStatus;
import com.pos.repository.RestaurantOrderRepository;
import com.pos.repository.RestaurantTableRepository;
import com.pos.service.impl.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TableService {

    private final RestaurantTableRepository tableRepository;
    private final RestaurantOrderRepository orderRepository;
    private final AuditService auditService;

    private static final List<OrderStatus> UNSETTLED_TABLE_ORDER_STATUSES = List.of(
            OrderStatus.OPEN, OrderStatus.KITCHEN, OrderStatus.READY, OrderStatus.COMPLETED);

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

        RestaurantTable table = tableRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Table not found"));
        TableStatus previous = table.getStatus();
        if (previous == next) return table;

        boolean allowed = switch (previous) {
            case AVAILABLE -> next == TableStatus.RESERVED || next == TableStatus.CLEANING;
            case RESERVED -> next == TableStatus.AVAILABLE || next == TableStatus.CLEANING;
            case OCCUPIED -> next == TableStatus.CLEANING;
            case CLEANING -> next == TableStatus.AVAILABLE;
        };
        if (!allowed) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Invalid table transition. New occupancy is created by starting a dine-in order.");
        }
        if (previous == TableStatus.OCCUPIED
                && orderRepository.existsByTable_IdAndStatusIn(id, UNSETTLED_TABLE_ORDER_STATUSES)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This table has an unsettled order. Complete or cancel the order before cleaning it.");
        }

        table.setStatus(next);
        table.setOccupiedAt(next == TableStatus.OCCUPIED ? LocalDateTime.now() : null);
        RestaurantTable saved = tableRepository.save(table);
        auditService.log(actor, "TABLE_STATUS_CHANGED", "RestaurantTable", id.toString(),
                previous == null ? null : previous.name(), next.name());
        return saved;
    }
}
