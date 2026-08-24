package com.northstar.crm.repo;

import com.northstar.crm.domain.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

// This interface handles all database save/read operations for Customer rows.
// Same pattern as InteractionRepository — Spring Data JPA generates the SQL for us.
@Repository
public interface CustomerRepository extends JpaRepository<Customer, String> {
}