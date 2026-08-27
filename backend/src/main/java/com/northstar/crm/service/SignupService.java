package com.northstar.crm.service;

import com.northstar.crm.domain.PendingSignupRequest;
import com.northstar.crm.domain.User;
import com.northstar.crm.repo.PendingSignupRequestRepository;
import com.northstar.crm.repo.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SignupService {

    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_APPROVED = "APPROVED";
    private static final String STATUS_REJECTED = "REJECTED";
    private static final String DEFAULT_APPROVAL_ROLE = "AGENT";

    private final PendingSignupRequestRepository requestRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public SignupService(
            PendingSignupRequestRepository requestRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.requestRepository = requestRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // Called from the public /api/auth/signup endpoint. Anyone can call
    // this, but it only ever creates a PENDING request -- never a real,
    // login-capable account.
    @Transactional
    public PendingSignupRequest requestAccount(String username, String rawPassword) {
        if (username == null || username.isBlank()) {
            throw new InvalidSignupException("username is required");
        }
        if (rawPassword == null || rawPassword.isBlank()) {
            throw new InvalidSignupException("password is required");
        }

        // Already a real account -- don't let them queue a duplicate.
        if (userRepository.existsById(username)) {
            throw new SignupConflictException(username);
        }
        // Already has a request awaiting review -- don't queue a second one.
        // A REJECTED request does not block a retry.
        if (requestRepository.existsByUsernameAndStatus(username, STATUS_PENDING)) {
            throw new SignupConflictException(username);
        }

        // Hash immediately. The plaintext password never touches the
        // database, even while the request is sitting in PENDING.
        String passwordHash = passwordEncoder.encode(rawPassword);

        PendingSignupRequest request =
                new PendingSignupRequest(UUID.randomUUID(), username, passwordHash, STATUS_PENDING, Instant.now());

        return requestRepository.save(request);
    }

    // Admin-only: everything currently awaiting a decision, oldest first.
    public List<PendingSignupRequest> listPending() {
        return requestRepository.findByStatusOrderByRequestedAtAsc(STATUS_PENDING);
    }

    // Admin-only: turns a PENDING request into a real, login-capable
    // app_user with the given role (defaults to AGENT if not specified).
    @Transactional
    public void approve(UUID requestId, String role, String reviewerUsername) {
        PendingSignupRequest request = requestRepository
                .findById(requestId)
                .orElseThrow(() -> new SignupRequestNotFoundException(requestId));

        if (!STATUS_PENDING.equals(request.getStatus())) {
            throw new SignupAlreadyReviewedException(requestId, request.getStatus());
        }

        String resolvedRole = (role == null || role.isBlank()) ? DEFAULT_APPROVAL_ROLE : role;

        // The password hash was already computed at signup time -- approving
        // just copies it into a real account, never re-touching a plaintext value.
        User newUser = new User(request.getUsername(), request.getPasswordHash(), resolvedRole);
        userRepository.save(newUser);

        request.setStatus(STATUS_APPROVED);
        request.setReviewedBy(reviewerUsername);
        request.setReviewedAt(Instant.now());
        requestRepository.save(request);
    }

    // Admin-only: marks the request closed without creating an account.
    @Transactional
    public void reject(UUID requestId, String reviewerUsername) {
        PendingSignupRequest request = requestRepository
                .findById(requestId)
                .orElseThrow(() -> new SignupRequestNotFoundException(requestId));

        if (!STATUS_PENDING.equals(request.getStatus())) {
            throw new SignupAlreadyReviewedException(requestId, request.getStatus());
        }

        request.setStatus(STATUS_REJECTED);
        request.setReviewedBy(reviewerUsername);
        request.setReviewedAt(Instant.now());
        requestRepository.save(request);
    }
}