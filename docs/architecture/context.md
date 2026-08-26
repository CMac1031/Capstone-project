# Northstar CRM - Architecture Context

## Purpose

Northstar CRM allows an authenticated agent to search for a customer,
view the customer profile, and record an interaction.

## Primary User

- CRM Agent: Searches for customers and records interactions.
- Administrator: Has access to protected administrative operations.

## System Scope

The system supports the following demonstration journey:

1. Agent logs in.
2. Agent searches for CUS-1001.
3. Agent opens Amina Khan's profile.
4. Agent records an interaction.
5. The interaction is saved in PostgreSQL.
6. An interaction event is published to Kafka.
7. A Kafka consumer processes the event.

## External Systems

- PostgreSQL: Stores customers and interactions.
- Apache Kafka: Delivers interaction events.
- GitHub Actions: Builds, tests, and scans the application.
- k3s: Runs the deployed application.

## Context Diagram

```mermaid
flowchart LR
    Agent["CRM Agent"] --> CRM["Northstar CRM"]
    CRM --> DB[("PostgreSQL")]
    CRM --> Kafka["Apache Kafka"]
    Pipeline["GitHub Actions"] --> CRM
