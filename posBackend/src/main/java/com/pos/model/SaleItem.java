package com.pos.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Setter
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SaleItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    @JsonIgnoreProperties({"cartList", "hibernateLazyInitializer"})
    private Product product;

    private int quantity;
    private double price;

    @Column(length = 250)
    private String notes;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "sale_item_modifiers",
            joinColumns = @JoinColumn(name = "sale_item_id"),
            inverseJoinColumns = @JoinColumn(name = "modifier_id"))
    @Builder.Default
    private List<Modifier> modifiers = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_id", nullable = false)
    private Sales sales;
}
