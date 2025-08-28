package com.pos.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class SaleItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    int id;
    int productId;
    int quantity;
    double price;

    @ManyToOne
    @JoinColumn(name = "sale_id", nullable = false)
    private Sales sales;
}
