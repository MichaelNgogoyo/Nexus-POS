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
    @Column(name = "opening_balance", nullable = false, precision = 19, scale = 2)
    private BigDecimal openingBalance = BigDecimal.ZERO;

    @Column(name = "closing_balance", precision = 19, scale = 2)
    private BigDecimal closingBalance;
    @Column(name = "expected_balance", precision = 19, scale = 2)
    private BigDecimal expectedBalance;
    @Column(precision = 19, scale = 2)
    private BigDecimal variance;

    private LocalDateTime openedAt;
    private LocalDateTime closedAt;

    private String notes;

    @PrePersist
    protected void onCreate() {
        openedAt = LocalDateTime.now();
    }
}
