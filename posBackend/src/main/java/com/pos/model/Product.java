package com.pos.model;


import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@Setter
@Builder
@Getter
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;
    private String name;
    private Double price;
    private boolean active;
    private String imageName;//production image handling : research
    private String imageType;
    @Lob
    private byte[] imageData;
    private double discount;
    private int quantity; //stock

    @OneToMany
    List<Cart> cartList;

    //product image
    //product discount
    //boolean active
}
