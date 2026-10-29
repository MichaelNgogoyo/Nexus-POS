package com.pos.config.auth;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityConfigAuthoritiesTest {

    @Test
    void onlyMapsClientRolesFromTheConfiguredPosClientAndKeepsRealmRoles() {
        SecurityConfig config = new SecurityConfig();
        ReflectionTestUtils.setField(config, "posClientId", "pos-client");
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject("staff-subject")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(60))
                .claim("preferred_username", "cashier")
                .claim("realm_access", Map.of("roles", List.of("AUDITOR")))
                .claim("resource_access", Map.of(
                        "pos-client", Map.of("roles", List.of("cashier")),
                        "unrelated-client", Map.of("roles", List.of("ADMIN", "MANAGER"))))
                .build();

        AbstractAuthenticationToken authentication = config.jwtAuthenticationConverter().convert(jwt);
        List<String> authorities = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        assertThat(authentication.getName()).isEqualTo("cashier");
        assertThat(authorities).contains("ROLE_CASHIER", "ROLE_AUDITOR");
        assertThat(authorities).doesNotContain("ROLE_ADMIN", "ROLE_MANAGER");
    }
}
