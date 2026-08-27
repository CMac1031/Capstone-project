package com.northstar.crm.service;

// Thrown for a malformed signup request (missing username/password).
// ApiExceptionHandler maps this to 400 Bad Request.
public class InvalidSignupException extends RuntimeException {
    public InvalidSignupException(String message) {
        super(message);
    }
}