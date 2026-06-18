package com.pos.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "purchase_order_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    private PurchaseOrder purchaseOrder;

    private Long productId;
    private String productName;
    private Integer orderedQuantity;
    private Integer receivedQuantity = 0;
    private BigDecimal unitCost;
    private BigDecimal lineTotal;
}
