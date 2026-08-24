package com.northstar.crm.messaging;

import java.time.Instant;
import java.util.UUID;

// This file defines the SHAPE of the "event" that gets published to Kafka.
// This is the same contract we shared with Michael.
// V1 = "Version 1". We put the version in the class name on purpose,
// so if this event shape ever changes, we can make a separate V2 later.
public record CustomerInteractionRecordedV1(

        // A unique ID for this specific event.
        // Kafka can sometimes deliver the same message twice by accident,
        // so later, Michael's consumer will use this eventId to say
        // "I've already handled this one, skip it." This value must NOT
        // change even if the send is retried.
        UUID eventId,

        // The "label" for this event. Always fixed to "CustomerInteractionRecorded".
        String eventType,

        // The version number of this event shape.
        // This used to be a String("1"), but we changed it to an int(1)
        // per Michael's request — comparing numbers (!= 1) is less
        // error-prone than comparing strings.
        int eventVersion,

        // Which interaction (which row in the database) this event is about.
        UUID interactionId,

        // Which customer this interaction belongs to. e.g. "CUS-1001"
        // When we publish to Kafka, this value is used as the partition key —
        // that's what keeps one customer's events arriving in order.
        String customerId,

        // The type of interaction: one of CALL / EMAIL / NOTE / MEETING.
        String interactionType,

        // An ID used to trace a request all the way from the frontend
        // through to this Kafka event.
        String correlationId,

        // The exact moment this event happened.
        Instant occurredAt

) {

    // This event must always carry this exact name, so instead of typing
    // it out by hand every time, we lock it in as a constant here.
    public static final String TYPE = "CustomerInteractionRecorded";

    // This event must always be version 1, so we lock that in too.
    // It's an int now, so no quotes — just the number 1.
    public static final int VERSION = 1;

    // A shortcut method for building an event.
    // Without this, we'd have to manually generate the eventId, type out
    // TYPE/VERSION, and stamp the current time every single time —
    // tedious and easy to get wrong.
    // With this method, we only need to supply 4 values (which interaction,
    // which customer, what type, what correlationId), and everything else
    // (eventId, TYPE, VERSION, occurredAt) gets filled in automatically.
    public static CustomerInteractionRecordedV1 from(
            UUID interactionId, String customerId, String interactionType, String correlationId) {
        return new CustomerInteractionRecordedV1(
                UUID.randomUUID(),   // generate a brand-new unique ID
                TYPE,                // the fixed label from above
                VERSION,             // the fixed version number from above
                interactionId,
                customerId,
                interactionType,
                correlationId,
                Instant.now());      // the current moment in time
    }
}