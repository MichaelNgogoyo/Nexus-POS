package com.pos.dto;

import lombok.Data;

@Data
public record BlogRequest(
        String title,
        String body,
        String author
) {
}
