package com.northstar.crm.service;

import java.util.UUID;

// Thrown when an admin tries to approve/reject a request id that doesn't
// exist. ApiExceptionHandler maps this to 404 Not Found.
public class SignupRequestNotFoundException extends RuntimeException {
    public SignupRequestNotFoundException(UUID requestId) {
        super("No pending signup request found with id: " + requestId);
    }
}