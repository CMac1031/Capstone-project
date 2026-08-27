package com.northstar.crm.service;

public class DuplicatePhoneException extends RuntimeException {
    public DuplicatePhoneException(String phone) {
        super("phone number is already in use: " + phone);
    }
}