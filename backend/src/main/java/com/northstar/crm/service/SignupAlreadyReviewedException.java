package com.northstar.crm.service;

import java.util.UUID;

// Thrown when an admin tries to approve/reject a request that has already
// been decided. ApiExceptionHandler maps this to 409 Conflict.
public class SignupAlreadyReviewedException extends RuntimeException {
    public SignupAlreadyReviewedException(UUID requestId, String currentStatus) {
        super("Signup request " + requestId + " was already reviewed (status: " + currentStatus + ")");
    }
}