package com.pos.controller;

import com.pos.model.Reservation;
import com.pos.model.ReservationStatus;
import com.pos.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationRepository reservationRepository;

    @GetMapping
    public List<Reservation> getAll() {
        return reservationRepository.findAll();
    }

    @GetMapping("/today")
    public List<Reservation> getToday() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1).minusNanos(1);
        return reservationRepository
                .findByReservationTimeBetweenOrderByReservationTimeAsc(startOfDay, endOfDay);
    }

    @PostMapping
    public ResponseEntity<Reservation> create(@RequestBody Reservation reservation) {
        return ResponseEntity.ok(reservationRepository.save(reservation));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Reservation> update(@PathVariable Long id, @RequestBody Reservation updated) {
        return reservationRepository.findById(id).map(existing -> {
            existing.setCustomerName(updated.getCustomerName());
            existing.setCustomerPhone(updated.getCustomerPhone());
            existing.setGuestCount(updated.getGuestCount());
            existing.setTable(updated.getTable());
            existing.setReservationTime(updated.getReservationTime());
            existing.setNotes(updated.getNotes());
            existing.setStatus(updated.getStatus());
            return ResponseEntity.ok(reservationRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Reservation> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return reservationRepository.findById(id).map(existing -> {
            existing.setStatus(ReservationStatus.valueOf(body.get("status")));
            return ResponseEntity.ok(reservationRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancel(@PathVariable Long id) {
        if (reservationRepository.findById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Reservation existing = reservationRepository.findById(id).get();
        existing.setStatus(ReservationStatus.CANCELLED);
        reservationRepository.save(existing);
        return ResponseEntity.noContent().build();
    }
}
