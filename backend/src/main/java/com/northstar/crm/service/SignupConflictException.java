package com.northstar.crm.service;

// Thrown when a username is already a real account, or already has a
// PENDING request. ApiExceptionHandler maps this to 409 Conflict.
public class SignupConflictException extends RuntimeException {
    public SignupConflictException(String username) {
        super("An account or pending request already exists for username: " + username);
    }
}