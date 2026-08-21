package com.northstar.crm.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

// This class represents ONE ROW in the customer_interaction database table.
// @Entity tells Spring "this class maps to a real DB table, not just a data shape".
@Entity
@Table(name = "customer_interaction") // the exact table name in the database
public class Interaction {

    // @Id marks this field as the PRIMARY KEY of the table (unique row identifier).
    @Id
    private UUID id;

    // @Column maps this Java field to a specific database column.
    // nullable = false means the database will REJECT saving a row without this value.
    @Column(name = "customer_id", nullable = false, length = 20)
    private String customerId;

    @Column(name = "interaction_type", nullable = false, length = 20)
    private String interactionType;

    @Column(name = "summary", nullable = false, length = 2000)
    private String summary;

    @Column(name = "correlation_id", nullable = false, length = 100)
    private String correlationId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    // JPA (the database library) REQUIRES an empty constructor like this to exist,
    // even though we never call it ourselves. It's a technical requirement, not optional.
    protected Interaction() {}

    // This is the constructor WE actually use to create a new Interaction object.
    public Interaction(
            UUID id,
            String customerId,
            String interactionType,
            String summary,
            String correlationId,
            Instant createdAt) {
        this.id = id;
        this.customerId = customerId;
        this.interactionType = interactionType;
        this.summary = summary;
        this.correlationId = correlationId;
        this.createdAt = createdAt;
    }

    // Getters: these let other files READ the values, but not change them
    // (there are no setter methods — once created, an Interaction can't be edited).
    public UUID getId() {
        return id;
    }

    public String getCustomerId() {
        return customerId;
    }

    public String getInteractionType() {
        return interactionType;
    }

    public String getSummary() {
        return summary;
    }

    public String getCorrelationId() {
        return correlationId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}