package com.pos.service.impl;

import com.pos.dto.CashMovementRequest;
import com.pos.dto.CashMovementResponse;
import com.pos.model.CashMovement;
import com.pos.model.CashMovementType;
import com.pos.model.Shift;
import com.pos.model.ShiftStatus;
import com.pos.repository.CashMovementRepository;
import com.pos.repository.ShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class CashMovementService {

    private final CashMovementRepository movementRepository;
    private final ShiftRepository shiftRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<CashMovementResponse> listForShift(Long shiftId, String actor, boolean manager) {
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shift not found"));
        if (!manager && !Objects.equals(actor, shift.getCashierId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cashiers may only view their own shift movements");
        }
        return movementRepository.findByShiftIdOrderByCreatedAtAscIdAsc(shiftId).stream()
                .map(CashMovementResponse::from).toList();
    }

    @Transactional
    public CashMovementResponse recordShiftMovement(Long shiftId, CashMovementRequest request, String actor) {
        if (request.type() == CashMovementType.CASH_REFUND) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cash refunds must be recorded through the sale return workflow");
        }
        Shift shift = requireOpenShiftForUpdate(shiftId);
        CashMovement prior = movementRepository.findByIdempotencyKey(request.idempotencyKey()).orElse(null);
        if (prior != null) {
            if (!prior.getShiftId().equals(shiftId) || prior.getType() != request.type()
                    || prior.getAmount().compareTo(request.amount()) != 0
                    || !prior.getReason().equals(request.reason().trim()) || !prior.getCreatedBy().equals(actor)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Idempotency key is already associated with a different cash movement");
            }
            return CashMovementResponse.from(prior);
        }
        CashMovement saved = saveMovement(shift, request.type(), request.amount(), request.reason(), null,
                request.idempotencyKey(), actor);
        auditService.log(actor, "CASH_MOVEMENT_RECORDED", "Shift", shiftId.toString(), null,
                request.type() + " amount=" + request.amount().toPlainString() + "; movement=" + saved.getId());
        return CashMovementResponse.from(saved);
    }

    @Transactional
    public void recordCashRefund(Long shiftId, Long saleId, BigDecimal amount, String reason, String actor) {
        Shift shift = requireOpenShiftForUpdate(shiftId);
        if (movementRepository.findBySaleId(saleId).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A cash refund is already recorded for this sale");
        }
        CashMovement saved = saveMovement(shift, CashMovementType.CASH_REFUND, amount, reason,
                saleId, "cash-refund-sale-" + saleId, actor);
        auditService.log(actor, "CASH_REFUND_RECORDED", "Sale", saleId.toString(), null,
                "CASH_REFUND amount=" + amount.toPlainString() + "; shift=" + shiftId + "; movement=" + saved.getId());
    }

    @Transactional(readOnly = true)
    public BigDecimal netMovementForShift(Long shiftId) {
        BigDecimal inflow = movementRepository.sumAmount(shiftId, CashMovementType.CASH_IN);
        BigDecimal outflow = movementRepository.sumAmount(shiftId, CashMovementType.CASH_OUT);
        BigDecimal refunds = movementRepository.sumAmount(shiftId, CashMovementType.CASH_REFUND);
        return inflow.subtract(outflow).subtract(refunds).setScale(2, java.math.RoundingMode.HALF_UP);
    }

    @Transactional
    public Shift lockOpenShiftForCashier(String cashierId) {
        return shiftRepository.findByCashierIdAndStatusForUpdate(cashierId, ShiftStatus.OPEN)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                        "Open a register shift before recording a cash payment"));
    }

    private Shift requireOpenShiftForUpdate(Long shiftId) {
        Shift shift = shiftRepository.findByIdForUpdate(shiftId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shift not found"));
        if (shift.getStatus() != ShiftStatus.OPEN) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cash movements require an open shift");
        }
        return shift;
    }

    private CashMovement saveMovement(Shift shift, CashMovementType type, BigDecimal amount, String reason,
                                      Long saleId, String idempotencyKey, String actor) {
        BigDecimal normalizedAmount;
        try {
            normalizedAmount = amount.setScale(2, java.math.RoundingMode.UNNECESSARY);
        } catch (ArithmeticException invalidPrecision) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cash movement amounts must have at most two decimal places");
        }
        if (normalizedAmount.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cash movement amount must be positive");
        }
        return movementRepository.save(CashMovement.builder()
                .shiftId(shift.getId())
                .type(type)
                .amount(normalizedAmount)
                .reason(reason.trim())
                .saleId(saleId)
                .idempotencyKey(idempotencyKey)
                .createdBy(actor)
                .build());
    }
}
