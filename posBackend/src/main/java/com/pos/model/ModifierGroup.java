package com.pos.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "modifier_groups")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModifierGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private Boolean required = false;
    private Boolean multiSelect = false;
    private Integer minSelect = 0;
    private Integer maxSelect = 1;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    @OneToMany(mappedBy = "group", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Modifier> modifiers = new ArrayList<>();
}
