# ADR-007: Use Java 21 and Spring Boot for the backend

- **Status:** Accepted
- **Date:** 2026-08-26
- **Deciders:** Team A, Pretty Nice Code(PNC)
- **Related backlog:** CAP-07

## Context

Northstar CRM requires a backend application that provides:

- REST API endpoints
- Request validation
- Customer and interaction business logic
- PostgreSQL persistence
- Flyway database migrations
- Kafka event production and consumption
- JWT authentication
- Role-based authorization
- Standardized HTTP error responses
- Health endpoints for Kubernetes
- Automated unit and integration tests

The backend must use a layered structure so HTTP handling, business logic, persistence, messaging, and security responsibilities remain separated.

The course and development team use Java, Maven, Spring Boot, Spring Data JPA, Spring Security, Spring Kafka, and JUnit.

## Decision

We will implement the Northstar CRM backend using Java 21 and Spring Boot.

The backend will use:

- Java 21 as the programming language and runtime
- Spring Boot as the application framework
- Maven for dependency management and builds
- Spring Web for REST endpoints
- Jakarta Validation for request validation
- Spring Data JPA for PostgreSQL persistence
- Flyway for controlled schema migrations
- Spring Kafka for Kafka integration
- Spring Security for JWT authentication and RBAC
- Spring Boot Actuator for health, readiness, and liveness endpoints
- JUnit and Mockito for automated testing
- A layered package structure consisting of controllers, services, repositories, domain classes, messaging, consumers, DTOs, and security components

The application will be packaged as an executable JAR and run in a non-root Java 21 container.

The backend Docker build will use:

```dockerfile
RUN mvn -B clean verify
