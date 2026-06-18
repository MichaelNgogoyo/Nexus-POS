package com.pos.repository;

import com.pos.model.Reservation;
import com.pos.model.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    List<Reservation> findByReservationTimeBetweenOrderByReservationTimeAsc(
            LocalDateTime from, LocalDateTime to);
    List<Reservation> findByStatus(ReservationStatus status);
}
