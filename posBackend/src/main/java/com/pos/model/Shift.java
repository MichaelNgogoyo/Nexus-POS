package com.pos.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "shifts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Shift {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String cashierId;
    private String cashierName;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ShiftStatus status = ShiftStatus.OPEN;

    @Builder.Default
    private BigDecimal openingBalance = BigDecimal.ZERO;

    private BigDecimal closingBalance;
    private BigDecimal expectedBalance;
    private BigDecimal variance;

    private LocalDateTime openedAt;
    private LocalDateTime closedAt;

    private String notes;

    @PrePersist
    protected void onCreate() {
        openedAt = LocalDateTime.now();
    }
}
