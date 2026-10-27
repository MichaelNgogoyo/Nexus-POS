package com.pos.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

@Data
public class OrderStatusRequest {
    @NotBlank
    @Pattern(regexp = "OPEN|KITCHEN|READY|COMPLETED|PAID|CANCELLED|REFUNDED")
    private String status;
}
