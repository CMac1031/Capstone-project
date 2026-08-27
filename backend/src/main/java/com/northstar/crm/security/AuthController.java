package com.northstar.crm.security;

import com.northstar.crm.domain.PendingSignupRequest;
import com.northstar.crm.domain.User;
import com.northstar.crm.repo.UserRepository;
import com.northstar.crm.service.SignupService;
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

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final SignupService signupService;

    public AuthController(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            SignupService signupService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.signupService = signupService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        User user = userRepository.findById(request.username()).orElse(null);

        if (user == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid username or password");
        }

        String token = jwtService.generateToken(user.getUsername(), user.getRole());

        return ResponseEntity.ok(new LoginResponse(user.getRole(), token));
    }

    // POST /api/auth/signup -- public (permitAll in SecurityConfig). This
    // never creates a login-capable account by itself; it only queues a
    // PENDING request. An ADMIN must approve it via the admin endpoints
    // before the username/password can actually be used to log in.
    @PostMapping("/signup")
    public ResponseEntity<SignupResponse> signup(@RequestBody SignupRequest request) {
        PendingSignupRequest saved = signupService.requestAccount(request.username(), request.password());
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(new SignupResponse(saved.getId().toString(), saved.getStatus()));
    }

    public record LoginRequest(String username, String password) {}
    public record LoginResponse(String permission, String jwt) {}

    public record SignupRequest(String username, String password) {}
    public record SignupResponse(String requestId, String status) {}
}