package com.pos.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "kitchen_orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KitchenOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private RestaurantOrder order;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private KitchenStatus status = KitchenStatus.PENDING;

    private LocalDateTime receivedAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;

    private String notes;

    @PrePersist
    protected void onCreate() {
        receivedAt = LocalDateTime.now();
    }
}
