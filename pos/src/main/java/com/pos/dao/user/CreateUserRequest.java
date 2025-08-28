package com.pos.dao.user;

import com.pos.model.Role;
import lombok.Data;

import java.util.Set;

@Data
public class CreateUserRequest {
    private String username;
    private String password;
    private String email;
    private Set<Role> roles;
}
