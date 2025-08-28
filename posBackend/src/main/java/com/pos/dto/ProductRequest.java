package com.pos.dto;

public record ProductRequest(
        String name,
        Double price,
        Boolean active,
        double discount,
        int quantity
) {
}
