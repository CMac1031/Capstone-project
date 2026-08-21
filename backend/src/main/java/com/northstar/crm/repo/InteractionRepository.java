package com.northstar.crm.repo;

import com.northstar.crm.domain.Interaction;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

// This interface handles all database save/read operations for Interaction rows.
// We don't write the actual SQL ourselves — Spring Data JPA generates it for us.
@Repository
public interface InteractionRepository extends JpaRepository<Interaction, UUID> {

    // Custom query: "give me all interactions for this customer, newest first".
    // Spring reads the METHOD NAME and auto-generates the SQL from it —
    // we never write the query body ourselves.
    List<Interaction> findByCustomerIdOrderByCreatedAtDesc(String customerId);

    //BY doing this findBy-> Find customer ID
    //OrderBy -> Order it in Created At Desc.
}