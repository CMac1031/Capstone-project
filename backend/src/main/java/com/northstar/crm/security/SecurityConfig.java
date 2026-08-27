package com.northstar.crm.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import java.util.List;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // Explicit allowlist of origins that may call this API. Never use "*" together
    // with allowCredentials(true) -- browsers reject that combination anyway, and
    // it's a common CORS misconfiguration this hardening step is meant to avoid.
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // For now this is saying we are allowing any request from the following address.
        //GET, POST and etc these line tells that we only allows these kind of HTTP methods.
        //Third line is telling that we are only allowing header that contains Authorization which is JWT token and
        //Cotent type which tells it is a json header.
        config.setAllowedOrigins(List.of("http://localhost:5173"));
        config.setAllowedMethods(List.of("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config); //This line means that apply all of these config rules we made above
        //Apply these rules to "/**" every API path.
        return source;
    }

    //register the following method's result into spring
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Without this, Spring Security's default behavior returns 403 for
                // BOTH "no/invalid token" and "wrong role", which fails the
                // 401 vs 403 requirement. This explicitly separates the two cases.
                .exceptionHandling(ex -> ex
                        // No token / invalid token -> 401 Unauthorized
                        .authenticationEntryPoint((request, response, authException) ->
                                response.sendError(HttpStatus.UNAUTHORIZED.value(), "Unauthorized"))
                        // Valid token but wrong role -> 403 Forbidden
                        .accessDeniedHandler((request, response, accessDeniedException) ->
                                response.sendError(HttpStatus.FORBIDDEN.value(), "Forbidden")))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/login", "/api/auth/signup", "/actuator/health","/actuator/health/**").permitAll() // This part tells that everyone can access to it
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/customers").hasRole("ADMIN")
                        .requestMatchers("/api/customers/**").hasAnyRole("AGENT", "ADMIN") // This tells that anyone who has the following role can access to it
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        // This tells that make sure the jwtAuthenticationFilter runs first before the UsernamePasswordAuthenticationFilter runs.

        return http.build();
    }
}