package com.pos.controller;

import com.pos.model.Reservation;
import com.pos.model.ReservationStatus;
import com.pos.repository.ReservationRepository;
import com.pos.repository.RestaurantTableRepository;
import com.pos.service.impl.AuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReservationControllerWorkflowTest {
    @Mock private ReservationRepository reservationRepository;
    @Mock private RestaurantTableRepository tableRepository;
    @Mock private AuditService auditService;
    private ReservationController controller;
    private final UsernamePasswordAuthenticationToken cashier =
            new UsernamePasswordAuthenticationToken("cashier-1", "", List.of());

    @BeforeEach
    void setUp() {
        controller = new ReservationController(reservationRepository, tableRepository, auditService);
        lenient().when(reservationRepository.save(any(Reservation.class))).thenAnswer(invocation -> {
            Reservation reservation = invocation.getArgument(0);
            if (reservation.getId() == null) reservation.setId(45L);
            return reservation;
        });
    }

    @Test
    void createReservationValidatesAndAuditsPendingBooking() {
        Reservation request = validRequest();
        request.setStatus(ReservationStatus.COMPLETED);

        var response = controller.create(request, cashier);

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(response.getBody().getStatus()).isEqualTo(ReservationStatus.PENDING);
        assertThat(response.getBody().getCustomerName()).isEqualTo("Alex Guest");
        verify(auditService).log("cashier-1", "RESERVATION_CREATED", "Reservation", "45", null, "PENDING");
    }

    @Test
    void rejectsPastReservationTimeAndOversizedParty() {
        Reservation pastReservation = validRequest();
        pastReservation.setReservationTime(LocalDateTime.now().minusMinutes(5));
        assertThatThrownBy(() -> controller.create(pastReservation, cashier))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("future");
        verify(reservationRepository, never()).save(any());

        Reservation invalid = validRequest();
        invalid.setGuestCount(101);
        assertThatThrownBy(() -> controller.create(invalid, cashier))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("between 1 and 100");
        verifyNoInteractions(auditService);
    }

    @Test
    void onlyAllowsValidReservationLifecycleTransitionsAndAuditsThem() {
        Reservation reservation = existing(ReservationStatus.PENDING);
        when(reservationRepository.findById(45L)).thenReturn(Optional.of(reservation));

        assertThatThrownBy(() -> controller.updateStatus(45L, Map.of("status", "COMPLETED"), cashier))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("Invalid reservation status transition");
        verify(reservationRepository, never()).save(any());

        var response = controller.updateStatus(45L, Map.of("status", "CONFIRMED"), cashier);
        assertThat(response.getBody().getStatus()).isEqualTo(ReservationStatus.CONFIRMED);
        verify(auditService).log("cashier-1", "RESERVATION_STATUS_CHANGED", "Reservation", "45", "PENDING", "CONFIRMED");
    }

    @Test
    void cannotChangeTerminalReservationStatus() {
        when(reservationRepository.findById(45L)).thenReturn(Optional.of(existing(ReservationStatus.CANCELLED)));
        assertThatThrownBy(() -> controller.updateStatus(45L, Map.of("status", "CONFIRMED"), cashier))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("Invalid reservation status transition");
        verify(reservationRepository, never()).save(any());
    }

    private Reservation validRequest() {
        return Reservation.builder().customerName("  Alex Guest ").customerPhone("+254 700 000000")
                .guestCount(3).reservationTime(LocalDateTime.now().plusDays(1)).notes("Window seat")
                .status(ReservationStatus.PENDING).build();
    }

    private Reservation existing(ReservationStatus status) {
        return Reservation.builder().id(45L).customerName("Alex Guest").guestCount(3)
                .reservationTime(LocalDateTime.now().plusDays(1)).status(status).build();
    }
}
