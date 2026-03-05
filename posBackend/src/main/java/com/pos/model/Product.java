package com.pos.model;


import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
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

    @Column(unique = true)
    private String sku;        // e.g. "PRD-00123"

    @Column(unique = true)
    private String barcode;    // EAN-13 / UPC

    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;

    @JsonIgnore
    @OneToMany(mappedBy = "product", fetch = FetchType.LAZY)
    @Builder.Default
    private List<SaleItem> saleItems = new ArrayList<>();

}
