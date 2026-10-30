package com.pos.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TableStatusRequest {
    @NotBlank
    private String status;
}
