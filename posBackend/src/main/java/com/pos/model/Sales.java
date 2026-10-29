package com.pos.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Setter
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@NamedEntityGraph(
    name = "Sales.withItems",
    attributeNodes = @NamedAttributeNode(value = "saleItems", subgraph = "items.product"),
    subgraphs = @NamedSubgraph(name = "items.product", attributeNodes = @NamedAttributeNode("product"))
)
public class Sales {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String cashierId;
    @Column(name = "total_amount", nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;
    @Column(name = "subtotal_amount", nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal subtotalAmount = BigDecimal.ZERO;
    @Column(name = "tax_amount", nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal taxAmount = BigDecimal.ZERO;
    @Column(name = "amount_tendered", nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal amountTendered = BigDecimal.ZERO;
    @Column(name = "change_given", nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal changeGiven = BigDecimal.ZERO;
    private String paymentMethod;

    @Column(name = "service_charge_amount", nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal serviceChargeAmount = BigDecimal.ZERO;

    @Column(name = "idempotency_key", unique = true, length = 64)
    private String idempotencyKey;

    @Column(name = "restaurant_order_id")
    private Long restaurantOrderId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "restaurant_order_id", insertable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_sales_restaurant_order"))
    @JsonIgnore
    private RestaurantOrder restaurantOrder;

    @Column(name = "order_number", length = 32)
    private String orderNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "order_type", length = 32)
    private OrderType orderType;

    @Column(name = "table_id")
    private Long tableId;

    @Column(name = "room_number", length = 24)
    private String roomNumber;

    @Column(name = "guest_name", length = 120)
    private String guestName;

    @Column(length = 500)
    private String notes;

    @Enumerated(EnumType.STRING)
    private SaleStatus status;

    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "sales", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    @JsonIgnoreProperties({"sales", "hibernateLazyInitializer"})
    private List<SaleItem> saleItems = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = SaleStatus.COMPLETED;
        }
    }
}
