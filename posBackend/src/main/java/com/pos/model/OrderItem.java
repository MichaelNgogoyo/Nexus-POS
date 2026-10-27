package com.pos.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "order_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    @JsonIgnoreProperties({"items", "table"})
    private RestaurantOrder order;

    private Long productId;
    private String productName;
    private BigDecimal unitPrice;
    private Integer quantity;
    private BigDecimal lineTotal;
    private String notes;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "order_item_modifiers",
            joinColumns = @JoinColumn(name = "order_item_id"),
            inverseJoinColumns = @JoinColumn(name = "modifier_id"))
    @Builder.Default
    private List<Modifier> modifiers = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private KitchenStatus kitchenStatus = KitchenStatus.PENDING;
}
