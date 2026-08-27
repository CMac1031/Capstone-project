package com.northstar.crm.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

// A request from the public "Create account" form. NOT a login-capable
// account -- it only becomes one (a row in app_user) once an ADMIN
// approves it via /api/admin/signup-requests/{id}/approve.
@Entity
@Table(name = "pending_signup_request")
public class PendingSignupRequest {

    @Id
    private UUID id;

    @Column(name = "username", nullable = false, length = 50)
    private String username;

    // Hashed at signup time, the same way AuthController hashes for login --
    // the plaintext password is never persisted anywhere, even temporarily.
    @Column(name = "password_hash", nullable = false, length = 200)
    private String passwordHash;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "requested_at", nullable = false)
    private Instant requestedAt;

    @Column(name = "reviewed_by", length = 50)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    protected PendingSignupRequest() {}

    public PendingSignupRequest(UUID id, String username, String passwordHash, String status, Instant requestedAt) {
        this.id = id;
        this.username = username;
        this.passwordHash = passwordHash;
        this.status = status;
        this.requestedAt = requestedAt;
    }

    public UUID getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getRequestedAt() {
        return requestedAt;
    }

    public String getReviewedBy() {
        return reviewedBy;
    }

    public void setReviewedBy(String reviewedBy) {
        this.reviewedBy = reviewedBy;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(Instant reviewedAt) {
        this.reviewedAt = reviewedAt;
    }
}