package com.northstar.crm.security;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.northstar.crm.api.CustomerController;
import com.northstar.crm.api.InteractionController;
import com.northstar.crm.api.dto.InteractionResponse;
import com.northstar.crm.service.CustomerService;
import com.northstar.crm.service.InteractionService;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = {InteractionController.class, CustomerController.class})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtService.class})
@TestPropertySource(properties = "jwt.secret=test-only-secret-not-used-anywhere-else-32bytes")
class AuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockBean
    private InteractionService interactionService;

    @MockBean
    private CustomerService customerService;

    @Test
    void anonymousCreateUnauthorized() throws Exception {
        mockMvc.perform(post("/api/v1/interactions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"customerId":"CUS-1001","interactionType":"NOTE","summary":"x"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void malformedTokenUnauthorized() throws Exception {
        mockMvc.perform(post("/api/v1/interactions")
                        .header("Authorization", "Bearer this-is-not-a-real-jwt")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"customerId":"CUS-1001","interactionType":"NOTE","summary":"x"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void wrongRoleForbidden() throws Exception {
        String guestToken = jwtService.generateToken("intruder", "GUEST");

        mockMvc.perform(get("/api/customers")
                        .header("Authorization", "Bearer " + guestToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void authenticatedCreateSucceeds() throws Exception {
        String agentToken = jwtService.generateToken("agent1", "AGENT");

        when(interactionService.create(ArgumentMatchers.any(), ArgumentMatchers.any()))
                .thenReturn(new InteractionResponse(
                        UUID.randomUUID(), "CUS-1001", "NOTE", "test note",
                        "lab-request-001", Instant.now()));

        mockMvc.perform(post("/api/v1/interactions")
                        .header("Authorization", "Bearer " + agentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"customerId":"CUS-1001","interactionType":"NOTE","summary":"test note"}
                                """))
                .andExpect(status().isCreated());
    }
}