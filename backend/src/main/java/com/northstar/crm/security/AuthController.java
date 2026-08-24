package com.northstar.crm.security;

import com.northstar.crm.domain.User;
import com.northstar.crm.repo.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    // This tells that the following controller requires the following 3 dependencies to work:
    // UserRepository is to check if the username really exists in the DB
    // PasswordEncoder is to check if the inputted password is correct
    // JwtService is to issue a token if login is successful
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthController(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        // Check if the given username is valid. Look it up via userRepository;
        // if it's not found, this returns null, and we handle that below.
        User user = userRepository.findById(request.username()).orElse(null);

        // If the username doesn't exist OR the password doesn't match, return 401.
        if (user == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid username or password");
        }

        // If we got here, that means we have a valid username and password.
        // So we generate the token using JwtService.
        String token = jwtService.generateToken(user.getUsername(), user.getRole());

        // If everything succeeds, return status 200 with the role and token.
        return ResponseEntity.ok(new LoginResponse(user.getRole(), token));
    }

    public record LoginRequest(String username, String password) {}
    public record LoginResponse(String permission, String jwt) {}
}