package com.pos.config.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@Profile("!seed")
public class SecurityConfig {

    @Value("${cors.allowed-origins:http://localhost:5173,http://localhost:3000, http://0.0.0.0:3000}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .httpBasic(httpBasic -> httpBasic.disable())
            .formLogin(formLogin -> formLogin.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/", "/index.html", "/api/public/**", "/assets/**",
                                "/static/**", "/shop.svg", "/favicon.ico",
                                "/api/product/*/image",
                                "/api/config/**", "/actuator/health/**", "/actuator/info"
                        ).permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").hasRole("ADMIN")
                        .requestMatchers("/admin/**").hasRole("ADMIN")
                        .requestMatchers("/user/**").hasAnyRole("USER", "ADMIN")
                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));

        return http.build();
    }

    @Bean
    public Converter<Jwt, ? extends AbstractAuthenticationToken> jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter defaultScopeConverter = new JwtGrantedAuthoritiesConverter();

        return jwt -> {
            Set<GrantedAuthority> authorities = new HashSet<>(defaultScopeConverter.convert(jwt));
            authorities.addAll(extractKeycloakAuthorities(jwt));

            String principalName = jwt.getClaimAsString("preferred_username");
            if (principalName == null || principalName.isBlank()) {
                principalName = jwt.getSubject();
            }

            return new JwtAuthenticationToken(jwt, authorities, principalName);
        };
    }

    private Set<GrantedAuthority> extractKeycloakAuthorities(Jwt jwt) {
        Set<GrantedAuthority> authorities = new HashSet<>();

        Map<String, Object> realmAccess = jwt.getClaim("realm_access");
        if (realmAccess != null) {
            Object realmRoles = realmAccess.get("roles");
            addRoles(authorities, realmRoles);
        }

        Map<String, Object> resourceAccess = jwt.getClaim("resource_access");
        if (resourceAccess != null) {
            for (Object resourceValue : resourceAccess.values()) {
                if (resourceValue instanceof Map<?, ?> resourceMap) {
                    Object clientRoles = resourceMap.get("roles");
                    addRoles(authorities, clientRoles);
                }
            }
        }

        return authorities;
    }

    private void addRoles(Set<GrantedAuthority> authorities, Object rolesClaim) {
        if (!(rolesClaim instanceof List<?> roles)) {
            return;
        }

        for (Object roleObj : roles) {
            String role = Objects.toString(roleObj, "").trim();
            if (role.isEmpty()) {
                continue;
            }
            String normalized = role.toUpperCase();
            if (normalized.startsWith("ROLE_")) {
                normalized = normalized.substring(5);
            }
            authorities.add(new SimpleGrantedAuthority("ROLE_" + normalized));
        }
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = Arrays.asList(allowedOrigins.split(","));
        List<String> sanitizedOrigins = origins.stream().map(s -> s == null ? "" : s.trim()).filter(s -> !s.isEmpty()).toList();
        boolean hasWildcard = sanitizedOrigins.contains("*");
        if (hasWildcard) {
            configuration.setAllowedOriginPatterns(List.of("*"));
            configuration.setAllowCredentials(false);
        } else {
            configuration.setAllowedOrigins(sanitizedOrigins);
            configuration.setAllowCredentials(true);
        }
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Authorization", "Content-Disposition"));
        configuration.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
