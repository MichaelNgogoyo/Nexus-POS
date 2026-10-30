package com.pos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class KitchenStatusRequest {
    @NotBlank
    @Pattern(regexp = "PREPARING|READY|SERVED")
    private String status;
}
