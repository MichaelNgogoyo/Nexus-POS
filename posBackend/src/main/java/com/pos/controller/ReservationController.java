package com.pos.controller;

import com.pos.model.Reservation;
import com.pos.model.ReservationStatus;
import com.pos.model.RestaurantTable;
import com.pos.repository.ReservationRepository;
import com.pos.repository.RestaurantTableRepository;
import com.pos.service.impl.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','MANAGER','CASHIER')")
public class ReservationController {

    private final ReservationRepository reservationRepository;
    private final RestaurantTableRepository tableRepository;
    private final AuditService auditService;

    @GetMapping
    public List<Reservation> getAll() {
        return reservationRepository.findAll();
    }

    @GetMapping("/today")
    public List<Reservation> getToday() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1).minusNanos(1);
        return reservationRepository.findByReservationTimeBetweenOrderByReservationTimeAsc(startOfDay, endOfDay);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Reservation> create(@RequestBody Reservation request, Authentication authentication) {
        validate(request, true);
        Reservation reservation = Reservation.builder()
                .customerName(clean(request.getCustomerName(), 120, "Guest name", true))
                .customerPhone(clean(request.getCustomerPhone(), 32, "Phone", false))
                .guestCount(request.getGuestCount())
                .table(resolveTable(request.getTable()))
                .reservationTime(request.getReservationTime())
                .notes(clean(request.getNotes(), 500, "Notes", false))
                .status(ReservationStatus.PENDING)
                .build();
        Reservation saved = reservationRepository.save(reservation);
        auditService.log(authentication.getName(), "RESERVATION_CREATED", "Reservation", saved.getId().toString(), null, "PENDING");
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<Reservation> update(@PathVariable Long id, @RequestBody Reservation request, Authentication authentication) {
        Reservation existing = reservationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found"));
        if (isTerminal(existing.getStatus())) throw conflict("A completed, cancelled, or no-show reservation cannot be edited");
        validate(request, true);
        existing.setCustomerName(clean(request.getCustomerName(), 120, "Guest name", true));
        existing.setCustomerPhone(clean(request.getCustomerPhone(), 32, "Phone", false));
        existing.setGuestCount(request.getGuestCount());
        existing.setTable(resolveTable(request.getTable()));
        existing.setReservationTime(request.getReservationTime());
        existing.setNotes(clean(request.getNotes(), 500, "Notes", false));
        Reservation saved = reservationRepository.save(existing);
        auditService.log(authentication.getName(), "RESERVATION_UPDATED", "Reservation", id.toString(), "updated", "updated");
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}/status")
    @Transactional
    public ResponseEntity<Reservation> updateStatus(@PathVariable Long id,
                                                    @RequestBody Map<String, String> body,
                                                    Authentication authentication) {
        Reservation existing = reservationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found"));
        String requested = body == null ? null : body.get("status");
        ReservationStatus next;
        try {
            next = ReservationStatus.valueOf(requested == null ? "" : requested.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown reservation status");
        }
        ReservationStatus before = existing.getStatus();
        if (!isAllowed(before, next)) throw conflict("Invalid reservation status transition");
        existing.setStatus(next);
        Reservation saved = reservationRepository.save(existing);
        auditService.log(authentication.getName(), "RESERVATION_STATUS_CHANGED", "Reservation", id.toString(), before.name(), next.name());
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> cancel(@PathVariable Long id, Authentication authentication) {
        Reservation existing = reservationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found"));
        ReservationStatus before = existing.getStatus();
        if (!isAllowed(before, ReservationStatus.CANCELLED)) throw conflict("This reservation cannot be cancelled");
        existing.setStatus(ReservationStatus.CANCELLED);
        reservationRepository.save(existing);
        auditService.log(authentication.getName(), "RESERVATION_CANCELLED", "Reservation", id.toString(), before.name(), "CANCELLED");
        return ResponseEntity.noContent().build();
    }

    private boolean isAllowed(ReservationStatus before, ReservationStatus next) {
        return switch (before) {
            case PENDING -> next == ReservationStatus.CONFIRMED || next == ReservationStatus.CANCELLED || next == ReservationStatus.NO_SHOW;
            case CONFIRMED -> next == ReservationStatus.SEATED || next == ReservationStatus.CANCELLED || next == ReservationStatus.NO_SHOW;
            case SEATED -> next == ReservationStatus.COMPLETED;
            case COMPLETED, CANCELLED, NO_SHOW -> false;
        };
    }

    private boolean isTerminal(ReservationStatus status) {
        return status == ReservationStatus.COMPLETED || status == ReservationStatus.CANCELLED || status == ReservationStatus.NO_SHOW;
    }

    private void validate(Reservation reservation, boolean requireFuture) {
        if (reservation == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reservation details are required");
        clean(reservation.getCustomerName(), 120, "Guest name", true);
        clean(reservation.getCustomerPhone(), 32, "Phone", false);
        clean(reservation.getNotes(), 500, "Notes", false);
        if (reservation.getGuestCount() == null || reservation.getGuestCount() < 1 || reservation.getGuestCount() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Party size must be between 1 and 100");
        }
        if (reservation.getReservationTime() == null || (requireFuture && reservation.getReservationTime().isBefore(LocalDateTime.now()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reservation time must be in the future");
        }
    }

    private RestaurantTable resolveTable(RestaurantTable requested) {
        if (requested == null || requested.getId() == null) return null;
        return tableRepository.findById(requested.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Table not found"));
    }

    private String clean(String value, int maximum, String label, boolean required) {
        if (value == null) {
            if (required) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + " is required");
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.length() > maximum) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + " is too long");
        if (required && trimmed.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + " is required");
        return trimmed.isBlank() ? null : trimmed;
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}
