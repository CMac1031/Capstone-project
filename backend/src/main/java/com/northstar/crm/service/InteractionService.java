package com.northstar.crm.service;

import com.northstar.crm.api.dto.CreateInteractionRequest;
import com.northstar.crm.api.dto.InteractionResponse;
import com.northstar.crm.domain.Interaction;
import com.northstar.crm.repo.CustomerFixtures;
import com.northstar.crm.repo.InteractionRepository;
import java.time.Instant;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 이 파일은 우리 기능의 "두뇌"예요.
@Service
public class InteractionService {

    private static final String DEFAULT_CORRELATION_ID = "lab-request-001";

    private final InteractionRepository interactionRepository;
    private final CustomerFixtures customerFixtures;

    // 새로 추가됨: Spring 내부 쪽지(이벤트)를 던지는 도구.
    // 이것도 Spring이 미리 만들어놓은 걸 주입받아서 씀 (KafkaTemplate처럼).
    private final ApplicationEventPublisher applicationEventPublisher;

    public InteractionService(
            InteractionRepository interactionRepository,
            CustomerFixtures customerFixtures,
            ApplicationEventPublisher applicationEventPublisher) {
        this.interactionRepository = interactionRepository;
        this.customerFixtures = customerFixtures;
        this.applicationEventPublisher = applicationEventPublisher;
    }

    // @Transactional 추가됨: 이 메서드 전체를 "하나의 묶음"으로 관리하라는 표시.
    @Transactional
    public InteractionResponse create(CreateInteractionRequest request, String correlationHeader) {

        String correlationId = resolveCorrelationId(correlationHeader, request.correlationId());

        if (!customerFixtures.exists(request.customerId())) {
            throw new CustomerNotFoundException(request.customerId());
        }

        Interaction interaction = new Interaction(
                UUID.randomUUID(),
                request.customerId(),
                request.interactionType(),
                request.summary(),
                correlationId,
                Instant.now());

        Interaction saved = interactionRepository.save(interaction);

        // 바뀐 부분: eventPublisher.publish(saved)를 직접 부르는 대신,
        // "쪽지"만 던짐. 이건 즉시 실행 안 되고, 트랜잭션이 진짜 커밋된
        // 다음에야 InteractionEventPublisher가 이 쪽지를 받아서 처리함.
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