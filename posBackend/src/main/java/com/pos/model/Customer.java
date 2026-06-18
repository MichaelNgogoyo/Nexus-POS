package com.pos.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "customers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String phone;
    private String email;
    private String notes;

    @Builder.Default
    private Integer loyaltyPoints = 0;

    @Builder.Default
    private BigDecimal totalSpent = BigDecimal.ZERO;

    private LocalDateTime createdAt;
    private LocalDateTime lastVisitAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
