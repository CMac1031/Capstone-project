package com.northstar.crm.service;

import com.northstar.crm.api.dto.CreateInteractionRequest;
import com.northstar.crm.api.dto.InteractionResponse;
import com.northstar.crm.domain.Interaction;
import com.northstar.crm.repo.CustomerRepository;
import com.northstar.crm.repo.InteractionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InteractionServiceTest {

    @Mock
    private InteractionRepository interactionRepository;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private ApplicationEventPublisher applicationEventPublisher;

    @InjectMocks
    private InteractionService interactionService;

    @Test
    void create_savesInteraction_whenCustomerExists() {
        when(customerRepository.existsById("CUS-1001")).thenReturn(true);

        when(interactionRepository.save(any(Interaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CreateInteractionRequest request = new CreateInteractionRequest(
                "CUS-1001", "CALL", "Test call", null);

        InteractionResponse response = interactionService.create(request, null);

        assertThat(response.customerId()).isEqualTo("CUS-1001");
        assertThat(response.interactionType()).isEqualTo("CALL");
        assertThat(response.summary()).isEqualTo("Test call");
        assertThat(response.correlationId()).isEqualTo("lab-request-001");
    }

    @Test
    void create_throwsException_whenCustomerDoesNotExist() {
        when(customerRepository.existsById("CUS-9999")).thenReturn(false);

        CreateInteractionRequest request = new CreateInteractionRequest(
                "CUS-9999", "CALL", "Should fail", null);

        assertThatThrownBy(() -> interactionService.create(request, null))
                .isInstanceOf(CustomerNotFoundException.class)
                .hasMessageContaining("CUS-9999");
    }
}