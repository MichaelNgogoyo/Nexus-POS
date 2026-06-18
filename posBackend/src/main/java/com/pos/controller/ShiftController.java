package com.pos.controller;

import com.pos.dto.ShiftCloseRequest;
import com.pos.dto.ShiftOpenRequest;
import com.pos.model.Shift;
import com.pos.model.ShiftStatus;
import com.pos.repository.ShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/shifts")
@RequiredArgsConstructor
public class ShiftController {

    private final ShiftRepository shiftRepository;

    @GetMapping("/current")
    public ResponseEntity<Shift> getCurrentShift(@RequestParam String cashierId) {
        return shiftRepository.findByCashierIdAndStatus(cashierId, ShiftStatus.OPEN)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/open")
    public ResponseEntity<Shift> openShift(@RequestBody ShiftOpenRequest request) {
        Shift shift = Shift.builder()
                .cashierId(request.getCashierId())
                .cashierName(request.getCashierName())
                .openingBalance(request.getOpeningBalance())
                .status(ShiftStatus.OPEN)
                .build();
        return ResponseEntity.ok(shiftRepository.save(shift));
    }

    @PutMapping("/{id}/close")
    public ResponseEntity<Shift> closeShift(@PathVariable Long id,
                                            @RequestBody ShiftCloseRequest request) {
        return shiftRepository.findById(id).map(shift -> {
            shift.setStatus(ShiftStatus.CLOSED);
            shift.setClosingBalance(request.getClosingBalance());
            shift.setNotes(request.getNotes());
            shift.setClosedAt(LocalDateTime.now());
            if (request.getClosingBalance() != null && shift.getOpeningBalance() != null) {
                shift.setVariance(request.getClosingBalance().subtract(shift.getOpeningBalance()));
            }
            return ResponseEntity.ok(shiftRepository.save(shift));
        }).orElse(ResponseEntity.notFound().build());
    }
}
