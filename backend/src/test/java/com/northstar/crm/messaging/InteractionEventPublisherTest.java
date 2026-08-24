package com.northstar.crm.messaging;

import com.northstar.crm.domain.Interaction;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class InteractionEventPublisherTest {

    @Mock
    private KafkaTemplate<String, CustomerInteractionRecordedV1> kafkaTemplate;

    @Captor
    private ArgumentCaptor<CustomerInteractionRecordedV1> payloadCaptor;

    @Test
    void publish_sendsCorrectTopicKeyAndPayload() {
        InteractionEventPublisher publisher = new InteractionEventPublisher(kafkaTemplate);

        Interaction interaction = new Interaction(
                UUID.randomUUID(),
                "CUS-1001",
                "CALL",
                "Test call",
                "lab-request-001",
                Instant.now());

        publisher.publish(interaction);

        // send()가 정확히 어떤 값들로 호출됐는지 붙잡아서 확인
        verify(kafkaTemplate).send(
                org.mockito.ArgumentMatchers.eq(InteractionTopics.CUSTOMER_INTERACTIONS_V1),
                org.mockito.ArgumentMatchers.eq("CUS-1001"),
                payloadCaptor.capture());

        CustomerInteractionRecordedV1 payload = payloadCaptor.getValue();
        assertThat(payload.customerId()).isEqualTo("CUS-1001");
        assertThat(payload.interactionType()).isEqualTo("CALL");
        assertThat(payload.interactionId()).isEqualTo(interaction.getId());
        assertThat(payload.correlationId()).isEqualTo("lab-request-001");
        assertThat(payload.eventType()).isEqualTo(CustomerInteractionRecordedV1.TYPE);
        assertThat(payload.eventVersion()).isEqualTo(CustomerInteractionRecordedV1.VERSION);
    }
}