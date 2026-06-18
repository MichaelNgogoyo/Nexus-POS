package com.pos.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String actor;       // username

    @Column(nullable = false)
    private String action;      // e.g. "PRODUCT_CREATED", "PRICE_CHANGED", "REFUND_PROCESSED"

    private String entityType;  // e.g. "Product", "Sale"
    private String entityId;
    private String beforeValue; // JSON or plain text
    private String afterValue;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        timestamp = LocalDateTime.now();
    }
}
