package com.northstar.crm.service;

import com.northstar.crm.domain.Interaction;

// The purpose of this code file is to hold one thing which is an Interaction Object nothing else.
// It won't check or talk to Kafka. It just carries data from one place another.
// Instead of calling the publisher directly, we do will be doing
// applicationEventPublisher.publishEvent(new InteractionCreatedEvent(saved));
// This doesnt run anything rightaway. It is just a not that reminds interation was just aved.
public class InteractionCreatedEvent {

    private final Interaction interaction;

    public InteractionCreatedEvent(Interaction interaction) {
        this.interaction = interaction;
    }

    public Interaction getInteraction() {
        return interaction;
    }
}