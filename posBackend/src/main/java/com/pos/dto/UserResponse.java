package com.pos.dto;

import com.pos.model.Role;

import java.util.Set;

public record UserResponse(
        Long id,
        String username,
        String email,
        Set<Role> roles
) {
}
