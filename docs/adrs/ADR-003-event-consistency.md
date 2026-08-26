# ADR-003: Persist interactions before publishing events

- **Status:** Accepted
- **Date:** 2026-08-25
- **Deciders:** Team A, Pretty Nice Code(PNC)
- **Related backlog:** CAP-03

## Context

Creating a customer interaction affects two systems:

1. The interaction is stored in PostgreSQL.
2. A customer-interaction event is published to Kafka.

This creates a dual-write consistency risk. If Kafka publishing happens before the database transaction succeeds, consumers could receive an event for an interaction that was never stored. If the database succeeds but Kafka publishing fails, the database may contain an interaction without a corresponding Kafka event.

The capstone has a limited delivery time, but the team must still prevent events from being published for failed database transactions and document the remaining reliability risk.

## Decision

We will treat PostgreSQL as the system of record and persist the interaction before publishing its Kafka event.

The application will:

1. Validate the request.
2. Confirm that the customer exists.
3. Store the interaction in PostgreSQL.
4. Publish the versioned Kafka event after successful persistence.
5. Include the interaction ID and correlation ID in the event.
6. Make consumers idempotent by tracking processed event IDs where applicable.

For the capstone timebox, direct post-persistence publishing is acceptable. A transactional outbox is the recommended production follow-up if stronger delivery guarantees are required.

## Alternatives considered

| Option | Pros | Cons | Why not |
| ------ | ---- | ---- | ------- |
| A — Persist first, then publish | Simple, prevents events for rolled-back interactions, and fits the capstone timebox | A process failure after the database commit could prevent publishing | Selected with the remaining risk explicitly documented |
| B — Publish first, then persist | Consumers receive the event quickly | Consumers may receive an event for a database transaction that later fails | Violates the requirement that PostgreSQL remain the authoritative record |
| C — Transactional outbox | Stronger reliability and supports retrying unpublished events | Requires an outbox table, relay process, cleanup, and additional testing | Best production option, but larger than the current capstone timebox |

## Consequences

- **Positive:** Kafka events correspond to successfully persisted interactions. Interaction IDs and correlation IDs provide traceability between the API, database, and Kafka.
- **Negative / follow-ups:** A failure between the database commit and Kafka publication could still result in a missing event. A transactional outbox should be considered for production.
- **NFR impact:** Improves consistency and traceability. It does not provide guaranteed atomic delivery across PostgreSQL and Kafka.
- **Evidence later labs will need:** A successful `POST /api/v1/interactions`, the corresponding PostgreSQL row, a Kafka event with the same interaction ID and correlation ID, failure tests, and documented outbox follow-up.

## Links

- Context/container: `docs/architecture/`
- Backlog stories: `docs/backlog.md`
- Interaction service: `backend/src/main/java/com/northstar/crm/service/InteractionService.java`
- Event publisher: `backend/src/main/java/com/northstar/crm/messaging/InteractionEventPublisher.java`
- Processed-event store: `backend/src/main/java/com/northstar/crm/consumer/ProcessedEventStore.java`