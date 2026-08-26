# ADR-001: Use PostgreSQL as the system of record

- **Status:** Accepted
- **Date:** 2026-08-25
- **Deciders:** Team A, Pretty Nice Code(PNC)
- **Related backlog:** CAP-01

## Context

Northstar CRM must permanently store customer records, application users, and customer interactions.

The database must support:

- Relationships between customers and interactions
- Primary keys and foreign keys
- Unique customer email addresses
- Controlled account statuses and interaction types
- Transactions
- Schema versioning
- Persistent storage in Kubernetes
- Integration with Spring Data JPA

The database is the authoritative system of record. Kafka events communicate changes to other components, but Kafka does not replace relational storage.

## Decision

We will use PostgreSQL as the primary relational database for Northstar CRM.

Spring Data JPA repositories will provide application data access. Flyway migrations will create and update the schema.

Database integrity will be protected through:

- Primary-key constraints
- Foreign-key constraints
- Unique constraints
- Check constraints
- Non-null constraints
- Transactional service operations
- Flyway schema-version history

PostgreSQL will run in a Kubernetes StatefulSet with persistent storage.

## Alternatives considered

| Option | Pros | Cons | Why not |
| ------ | ---- | ---- | ------- |
| A — PostgreSQL | Strong relational integrity, transactions, JPA support, mature tooling, and Kubernetes support | Requires database administration and persistent storage | Selected because it satisfies the persistence and integrity requirements |
| B — H2 | Simple and fast for local tests | Different behavior from production PostgreSQL and not appropriate as the permanent system of record | May be useful in isolated tests, but not as the deployed database |
| C — MongoDB | Flexible document model and simple JSON storage | Relationships and integrity constraints would require more application-level enforcement | The CRM data model is relational and benefits from database-enforced constraints |

## Consequences

- **Positive:** Customer, interaction, and user data have a reliable system of record. Relational constraints prevent orphan interactions, duplicate emails, and invalid status values.
- **Negative / follow-ups:** PostgreSQL requires backups, persistent-volume management, credential protection, and forward-compatible migrations.
- **NFR impact:** Improves data integrity, durability, consistency, recoverability, and maintainability.
- **Evidence later labs will need:** Successful Flyway migrations, `flyway_schema_history`, database constraint failure tests, persistent-volume evidence, stored interaction records, and successful application connections.

## Links

- Context/container: `docs/architecture/`
- Backlog stories: `docs/backlog.md`
- Flyway migrations: `backend/src/main/resources/db/migration/`
- PostgreSQL manifest: `infrastructure/kubernetes/postgres.yml`