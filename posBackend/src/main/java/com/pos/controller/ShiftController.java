package com.pos.controller;

import com.pos.dto.ShiftCloseRequest;
import com.pos.dto.ShiftOpenRequest;
import com.pos.model.Shift;
import com.pos.model.ShiftStatus;
import com.pos.repository.ShiftRepository;
import com.pos.repository.SalesRepository;
import com.pos.service.impl.AuditService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.access.prepost.PreAuthorize;

import java.time.LocalDateTime;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/shifts")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','MANAGER','CASHIER')")
public class ShiftController {

    private final ShiftRepository shiftRepository;
    private final AuditService auditService;
    private final SalesRepository salesRepository;

    @GetMapping("/current")
    public ResponseEntity<Shift> getCurrentShift(@RequestParam String cashierId, Authentication authentication) {
        requireOwnerOrManager(cashierId, authentication);
        return shiftRepository.findByCashierIdAndStatus(cashierId, ShiftStatus.OPEN)
                .map(shift -> {
                    BigDecimal cashSales = BigDecimal.valueOf(salesRepository.sumCashSalesSince(shift.getCashierId(), shift.getOpenedAt())).setScale(2, java.math.RoundingMode.HALF_UP);
                    shift.setExpectedBalance(shift.getOpeningBalance().add(cashSales));
                    return ResponseEntity.ok(shift);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/open")
    public ResponseEntity<Shift> openShift(@Valid @RequestBody ShiftOpenRequest request, Authentication authentication) {
        String actorId = subject(authentication);
        requireOwnerOrManager(request.getCashierId(), authentication);
        if (request.getCashierId() == null || request.getOpeningBalance() == null || request.getOpeningBalance().signum() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cashier and a non-negative opening balance are required");
        }
        if (shiftRepository.findByCashierIdAndStatus(request.getCashierId(), ShiftStatus.OPEN).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An open shift already exists for this cashier");
        }
        Shift shift = Shift.builder()
                .cashierId(request.getCashierId())
                .cashierName(requireManager(authentication) ? request.getCashierName() : authentication.getName())
                .openingBalance(request.getOpeningBalance())
                .status(ShiftStatus.OPEN)
                .build();
        Shift saved = shiftRepository.save(shift);
        auditService.log(actorId, "SHIFT_OPENED", "Shift", saved.getId().toString(), null, "OPEN");
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}/close")
    public ResponseEntity<Shift> closeShift(@PathVariable Long id,
                                            @Valid @RequestBody ShiftCloseRequest request,
                                            Authentication authentication) {
        Shift shift = shiftRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shift not found"));
        requireOwnerOrManager(shift.getCashierId(), authentication);
        if (shift.getStatus() != ShiftStatus.OPEN) throw new ResponseStatusException(HttpStatus.CONFLICT, "Only open shifts can be closed");
        if (request.getClosingBalance() == null || request.getClosingBalance().signum() < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A non-negative closing balance is required");
        BigDecimal cashSales = BigDecimal.valueOf(salesRepository.sumCashSalesSince(shift.getCashierId(), shift.getOpenedAt())).setScale(2, java.math.RoundingMode.HALF_UP);
        BigDecimal expectedBalance = shift.getOpeningBalance().add(cashSales);
        shift.setStatus(ShiftStatus.CLOSED);
        shift.setClosingBalance(request.getClosingBalance());
        shift.setExpectedBalance(expectedBalance);
        shift.setNotes(request.getNotes() == null ? null : request.getNotes().trim());
        shift.setClosedAt(LocalDateTime.now());
        shift.setVariance(request.getClosingBalance().subtract(expectedBalance));
        Shift saved = shiftRepository.save(shift);
        auditService.log(subject(authentication), "SHIFT_CLOSED", "Shift", id.toString(), "OPEN",
                "CLOSED; expected=" + expectedBalance + "; variance=" + saved.getVariance());
        return ResponseEntity.ok(saved);
    }

    private String subject(Authentication authentication) {
        return authentication.getPrincipal() instanceof Jwt jwt ? jwt.getSubject() : authentication.getName();
    }

    private boolean requireManager(Authentication authentication) {
        return authentication.getAuthorities().stream().anyMatch(authority ->
                authority.getAuthority().equals("ROLE_ADMIN") || authority.getAuthority().equals("ROLE_MANAGER"));
    }

    private void requireOwnerOrManager(String cashierId, Authentication authentication) {
        if (!requireManager(authentication) && !subject(authentication).equals(cashierId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cashiers may only access their own shift");
        }
    }
}
