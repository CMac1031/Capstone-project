package com.northstar.crm.repo;

import java.util.Set;
import org.springframework.stereotype.Component;

// This checks "does this customer ID actually exist?" using our fixed fixture list
// (CUS-1001, CUS-1002), since we don't have a real customer database yet.
// This is a temporary stand-in — Lab 50 will eventually own the real customer system.
@Component
public class CustomerFixtures {

    private static final Set<String> KNOWN_CUSTOMER_IDS = Set.of("CUS-1001", "CUS-1002");

    public boolean exists(String customerId) {
        return customerId != null && KNOWN_CUSTOMER_IDS.contains(customerId);
    }
}