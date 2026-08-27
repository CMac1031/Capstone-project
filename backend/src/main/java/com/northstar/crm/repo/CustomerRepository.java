package com.northstar.crm.repo;

import com.northstar.crm.domain.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

// This interface handles all database save/read operations for Customer rows.
// Same pattern as InteractionRepository — Spring Data JPA generates the SQL for us.
@Repository
public interface CustomerRepository extends JpaRepository<Customer, String> {

    // Used when creating a new customer: is this email/phone already on file?
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);

    // Used when editing an existing customer: is this email/phone used by
    // someone ELSE? (excludes the customer's own current row, so saving
    // a profile without changing its email doesn't falsely conflict with itself)
    boolean existsByEmailAndCustomerIdNot(String email, String customerId);
    boolean existsByPhoneAndCustomerIdNot(String phone, String customerId);
}