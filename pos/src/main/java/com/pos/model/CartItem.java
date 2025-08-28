package com.pos.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Builder
@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class CartItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    long id;

    int quantity;

    @ManyToOne
    @JoinColumn(name = "cart_product")
    Product product;

    @ManyToOne
    @JoinColumn(name = "cart_id")
    Cart cart;
}
