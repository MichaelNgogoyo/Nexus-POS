package com.pos.dto;

public record BlogRequest(
        String title,
        String body,
        String author
) {
}
