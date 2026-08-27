package com.northstar.crm.api;

import com.northstar.crm.domain.PendingSignupRequest;
import com.northstar.crm.service.SignupService;
import java.security.Principal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Every endpoint here is restricted to ADMIN in SecurityConfig
// (requestMatchers("/api/admin/**").hasRole("ADMIN")). An AGENT token
// hitting any of these gets a 403, not a 401 -- they're authenticated,
// just not allowed here.
@RestController
@RequestMapping("/api/admin/signup-requests")
public class AdminSignupController {

    private final SignupService signupService;

    public AdminSignupController(SignupService signupService) {
        this.signupService = signupService;
    }

    @GetMapping
    public List<PendingSignupRequestResponse> listPending() {
        return signupService.listPending().stream()
                .map(AdminSignupController::toResponse)
                .toList();
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<Void> approve(
            @PathVariable("id") UUID id, @RequestBody(required = false) ApproveRequest body, Principal principal) {
        String role = body != null ? body.role() : null;
        signupService.approve(id, role, principal.getName());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<Void> reject(@PathVariable("id") UUID id, Principal principal) {
        signupService.reject(id, principal.getName());
        return ResponseEntity.noContent().build();
    }

    private static PendingSignupRequestResponse toResponse(PendingSignupRequest request) {
        return new PendingSignupRequestResponse(
                request.getId().toString(), request.getUsername(), request.getStatus(), request.getRequestedAt());
    }

    // role is optional; SignupService.approve() defaults to "AGENT" when null/blank.
    public record ApproveRequest(String role) {}

    public record PendingSignupRequestResponse(
            String id, String username, String status, java.time.Instant requestedAt) {}
}