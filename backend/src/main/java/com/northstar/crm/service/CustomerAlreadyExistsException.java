package com.northstar.crm.service;

public class CustomerAlreadyExistsException extends RuntimeException {
    public CustomerAlreadyExistsException(String customerId) {
        super("Customer already exists with id: " + customerId);
    }
}