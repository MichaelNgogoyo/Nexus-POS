package com.pos.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
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
    private double totalAmount;
    private double taxAmount;          // tax portion of totalAmount
    private double amountTendered;     // cash handed by customer
    private double changeGiven;        // change returned
    private String paymentMethod;

    @Column(name = "service_charge_amount", nullable = false)
    @Builder.Default
    private double serviceChargeAmount = 0.0;

    @Column(name = "idempotency_key", unique = true, length = 64)
    private String idempotencyKey;

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
