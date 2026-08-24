package com.northstar.crm.service;

// This is a custom "error signal" we throw when someone asks for an interaction
// on a customer that doesn't exist (e.g. CUS-9999).
// RuntimeException is Java's built-in base class for "something went wrong" errors.
public class CustomerNotFoundException extends RuntimeException {

    public CustomerNotFoundException(String customerId) {
        super("Unknown customer: " + customerId);
    }
}