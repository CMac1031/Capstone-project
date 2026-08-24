package com.northstar.crm.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

// Runs once per incoming request. Reads the Authorization header, validates
// the JWT if present, and (if valid) tells Spring Security who this request
// is from and what role they have.
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    // @nonnull means that these three parameters should not be NULL
    // HTTpservletRequest request is the entire request we got that has URL and Header
    // HttpServletResponse is the response that will be send from here
    // Filterchain is doing sending these reqeust and respond to enxt security.
    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        // No token, or not a Bearer token: let the request continue unauthenticated.
        // SecurityFilterChain will reject it later if the endpoint requires auth.
        // Since the following token either not containing the token or not a Bearer token it just hand it over to next
        // Security since the following job is just to check if the token is valid or not and if valid give stamp that says valid.
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }
        // Since we only need the token part not the part that saying "Bearer " so we do substring(7) which will
        // get us the token part
        String token = authHeader.substring(7); // strip "Bearer "

        try {
            // Now try to extract the username and role from the token
            // Then catch that throws exception if it fails
            String username = jwtService.extractUsername(token);
            String role = jwtService.extractRole(token);

            //If the code got all the way up here then it means that token is verified
            // then makes token that says this user is valid
            UsernamePasswordAuthenticationToken authToken =
                    new UsernamePasswordAuthenticationToken(
                            username,
                            null,
                            List.of(new SimpleGrantedAuthority("ROLE_" + role)));

            SecurityContextHolder.getContext().setAuthentication(authToken);
        } catch (Exception ex) {
            // Invalid/expired/tampered token: do not authenticate.
            // Leave SecurityContext empty so the request is treated as anonymous.
            SecurityContextHolder.clearContext();
        }
        //After all these process now we hand this to next security.
        filterChain.doFilter(request, response);
    }
}