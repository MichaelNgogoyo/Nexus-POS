package com.pos.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "stock_movements")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    /** Positive = stock in, negative = stock out */
    @Column(nullable = false)
    private int delta;

    /** Running balance of product quantity after this movement */
    private int balanceAfter;

    private String reason;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
