package com.pos.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.Set;

/**
 * Local user profile record.
 * Authentication is handled exclusively by Keycloak (JWT resource server).
 * This entity stores app-specific profile data for each cashier/admin.
 * The {@code keycloakId} field (Keycloak subject claim "sub") is the link
 * between an incoming JWT and this profile.
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    /** Keycloak subject claim ("sub") — links this profile to a Keycloak account. */
    @Column(unique = true)
    private String keycloakId;

    @ElementCollection(fetch = FetchType.EAGER)
    @Enumerated(EnumType.STRING)
    private Set<Role> roles;
}