package com.northstar.crm.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// This represents a login account (an employee using the CRM), NOT a Customer.
// Customer = who the CRM is about. User = who is allowed to log in and use the system.
@Entity
@Table(name = "app_user") //Entitiy will saying that this class will be connected to the DB table.
// And declare that the table name will be "app_user"
public class User {

    //This part is saying that the username will be the primary key here
    @Id
    private String username;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    // "ADMIN" or "AGENT" — matches the frontend's Permission type.
    @Column(name = "role", nullable = false, length = 20)
    private String role;

    protected User() {}

    public User(String username, String passwordHash, String role) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.role = role;
    }

    public String getUsername() {
        return username;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getRole() {
        return role;
    }
}