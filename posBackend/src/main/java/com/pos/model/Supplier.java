package com.pos.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "suppliers")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Supplier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;
    private String contactName;
    private String phone;
    private String email;
    private String address;
    private Boolean active = true;
}
