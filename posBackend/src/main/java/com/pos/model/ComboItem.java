package com.pos.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "combo_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComboItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "combo_id", nullable = false)
    private Combo combo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    private Integer quantity = 1;
}
