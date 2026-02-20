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
@Data
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;
    private String name;
    private Double price;
    private boolean active;
    private String imageURL; //store object url in db
//    private String imageName;//production image handling : research
//    private String imageType;
//    @Lob
//    private byte[] imageData;
    private double discount;
    private int quantity; //stock

    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;

    @OneToMany
    List<Cart> cartList;

    //product image
    //product discount
    //boolean active
}
