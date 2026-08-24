package com.northstar.crm.service;

import com.northstar.crm.api.dto.CreateInteractionRequest;
import com.northstar.crm.api.dto.InteractionResponse;
import com.northstar.crm.domain.Interaction;
import com.northstar.crm.repo.CustomerRepository;
import com.northstar.crm.repo.InteractionRepository;
import java.time.Instant;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InteractionService {

    private static final String DEFAULT_CORRELATION_ID = "lab-request-001";
    private final CustomerRepository customerRepository;
    private final InteractionRepository interactionRepository;
    //private final CustomerFixtures customerFixtures;
    private final ApplicationEventPublisher applicationEventPublisher;

    public InteractionService(
            InteractionRepository interactionRepository,
            CustomerRepository customerRepository,
            //CustomerFixtures customerFixtures,
            ApplicationEventPublisher applicationEventPublisher) {
        this.interactionRepository = interactionRepository;
        //this.customerFixtures = customerFixtures;
        this.customerRepository = customerRepository;
        this.applicationEventPublisher = applicationEventPublisher;
    }


    //Transcational is a annotation that I put in. Wha this does is that make entire DB process as a one work.
    //IF one of it fails then roll back everything.
    @Transactional
    public InteractionResponse create(CreateInteractionRequest request, String correlationHeader) {
    //CreateInteractionRequest is a type that contains customerId,InteractionType, Summary, CorrelationId
        //Then I named it "request"
        //By the wat these inputs are called in InteractionController file where saying
        //    InteractionResponse body = interactionService.create(request, correlationHeader);

        //Now we get the correlationId by using helper function I made below.
        //what this does is that first look for correlationID from the give header from https and if not then check the
        //requested correlation id then if its empty or Null then it will use the default Correlation ID
        String correlationId = resolveCorrelationId(correlationHeader, request.correlationId());


        //This part is checking if the given customer ID really exists or not however this part is still a
        //fixture data. Once we do the group meeting, this part have to be changed
//        if (!customerFixtures.exists(request.customerId())) {
//            throw new CustomerNotFoundException(request.customerId());
//        }

        if (!customerRepository.existsById(request.customerId())) {
            throw new CustomerNotFoundException(request.customerId());
        }
        // Now I create entity so i can save this into the db
        Interaction interaction = new Interaction(
                UUID.randomUUID(),
                request.customerId(),
                request.interactionType(),
                request.summary(),
                correlationId,
                Instant.now());
        //By doing this I make new entitiy variable named saved and also update this new information into the db.
        Interaction saved = interactionRepository.save(interaction);


        applicationEventPublisher.publishEvent(new InteractionCreatedEvent(saved));

        return toResponse(saved);
    }

    private String resolveCorrelationId(String correlationHeader, String requestCorrelationId) {
        if (correlationHeader != null && !correlationHeader.isBlank()) {
            return correlationHeader;
        }
        if (requestCorrelationId != null && !requestCorrelationId.isBlank()) {
            return requestCorrelationId;
        }
        return DEFAULT_CORRELATION_ID;
    }

    private InteractionResponse toResponse(Interaction interaction) {
        return new InteractionResponse(
                interaction.getId(),
                interaction.getCustomerId(),
                interaction.getInteractionType(),
                interaction.getSummary(),
                interaction.getCorrelationId(),
                interaction.getCreatedAt());
    }
}