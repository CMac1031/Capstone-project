package com.northstar.crm.repo;

import com.northstar.crm.domain.PendingSignupRequest;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PendingSignupRequestRepository extends JpaRepository<PendingSignupRequest, UUID> {

    // Used to block a second signup while one for the same username is
    // still PENDING. A REJECTED request does not count -- the person is
    // allowed to try again.
    boolean existsByUsernameAndStatus(String username, String status);

    // Powers the admin approval queue: only rows still awaiting a decision.
    List<PendingSignupRequest> findByStatusOrderByRequestedAtAsc(String status);
}