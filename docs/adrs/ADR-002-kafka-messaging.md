# ADR-002: Use Apache Kafka for customer-interaction events

- **Status:** Accepted
- **Date:** 2026-08-25
- **Deciders:** Team A, Pretty Nice Code(PNC)
- **Related backlog:** CAP-02

## Context

When a customer interaction is recorded, Northstar CRM must persist the interaction and make an event available to downstream consumers.

Direct synchronous calls would tightly couple the backend to every downstream system. A temporary failure in one consumer could then prevent or delay the original interaction request.

The team needs a messaging approach that supports:

- Asynchronous communication
- Multiple independent consumers
- Event replay
- Ordering for events belonging to the same customer
- Consumer groups
- Failure handling through a dead-letter topic
- Versioned message contracts

## Decision

We will use Apache Kafka to publish versioned customer-interaction events.

The primary topic will be:

```text
crm.customer.interactions.v1
```