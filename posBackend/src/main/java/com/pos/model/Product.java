package com.pos.model;


import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    private Double price;
    private boolean active;
    private String imageURL;

    private double discount;
    private int quantity;

    /** When quantity drops to this level or below, the product appears in low-stock alerts. Default: 5 */
    @Builder.Default
    @Column(name = "low_stock_threshold", columnDefinition = "integer not null default 5")
    private int lowStockThreshold = 5;

    /** Reorder alert threshold — procurement should be triggered when stock falls to this level. */
    @Builder.Default
    private Integer reorderLevel = 5;

    /** Suggested quantity to order when restocking. */
    @Builder.Default
    private Integer reorderQuantity = 10;

    @Column(unique = true)
    private String sku;        // e.g. "PRD-00123"

    @Column(unique = true)
    private String barcode;    // EAN-13 / UPC

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;

    @JsonIgnore
    @OneToMany(mappedBy = "product", fetch = FetchType.LAZY)
    @Builder.Default
    private List<SaleItem> saleItems = new ArrayList<>();

}
