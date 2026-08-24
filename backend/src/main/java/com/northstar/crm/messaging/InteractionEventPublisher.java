package com.northstar.crm.messaging;

import com.northstar.crm.domain.Interaction;
import com.northstar.crm.service.InteractionCreatedEvent;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

// This is the file where it actually publish the kafka
@Component
public class InteractionEventPublisher {

    // Instead of making everything manualy this will be get injected by spring
    private final KafkaTemplate<String, CustomerInteractionRecordedV1> kafkaTemplate;

    public InteractionEventPublisher(
            KafkaTemplate<String, CustomerInteractionRecordedV1> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }
    // By using @TransactionalEventListener, this only triggers once the transaction actually gets committed.
    // If the transaction gets canceled or rolled back, then this method will not trigger.
    // The reason for this is to avoid the Kafka event getting triggered when it's actually not saved in the DB.
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onInteractionCreated(InteractionCreatedEvent event) {
        publish(event.getInteraction());
    }

    // This is the method that actually publish the event
    public void publish(Interaction interaction) {

// We take the info from the saved Interaction, and fill it into the CustomerInteractionRecordedV1
        CustomerInteractionRecordedV1 payload =
                CustomerInteractionRecordedV1.from(
                        interaction.getId(),
                        interaction.getCustomerId(),
                        interaction.getInteractionType(),
                        interaction.getCorrelationId());

        // Now we publish it on kafka
        // First value shows the name of the topic then second variable tells the partition key which is customer id
        // Then the third variable will contain the payload.
        kafkaTemplate.send(
                InteractionTopics.CUSTOMER_INTERACTIONS_V1,
                interaction.getCustomerId(),
                payload);
    }
}