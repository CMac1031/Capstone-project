# ADR-005: Deploy Northstar CRM using Kubernetes

- **Status:** Accepted
- **Date:** 2026-08-25
- **Deciders:** Team A, Pretty Nice Code(PNC)
- **Related backlog:** CAP-05

## Context

Northstar CRM contains multiple components that must run together:

- React frontend
- Spring Boot backend
- PostgreSQL database
- Apache Kafka broker

The team needs a repeatable deployment approach that provides service discovery, health monitoring, persistent storage, configuration management, and application recovery.

Docker Compose supports local development, but the capstone requires evidence of containerized deployment using Kubernetes/k3s. The deployment must also support readiness and liveness probes, non-root containers, resource limits, secrets outside source control, and rollback procedures.

The team currently uses k3d locally, which runs a lightweight k3s cluster inside Docker. The final release evidence will use the required k3s environment if the course requires the training k3s cluster specifically.

## Decision

We will deploy Northstar CRM using Kubernetes-compatible manifests.

The deployment will include:

- A dedicated `northstar-crm` namespace
- A PostgreSQL StatefulSet, Service, Secret references, and persistent volume
- A Kafka StatefulSet, Service, and persistent volume
- A Spring Boot backend Deployment and Service
- A React/Nginx frontend Deployment and Service
- Kubernetes readiness, liveness, and startup probes
- CPU and memory requests and limits
- Non-root container security settings
- Kubernetes Secrets for database and JWT configuration
- Immutable container image identifiers for release deployments
- A documented smoke-test and rollback procedure

Docker Compose may still be used for simpler local development, but Kubernetes will represent the complete deployment architecture.

## Alternatives considered

| Option | Pros | Cons | Why not |
| ------ | ---- | ---- | ------- |
| A — Run applications directly from terminals | Simple and fast during development | Manual startup, no container isolation, no service discovery, and difficult for teammates to reproduce | Does not provide the required deployment and recovery evidence |
| B — Docker Compose only | Easy local multi-container startup and straightforward networking | Limited orchestration, no Kubernetes probes, limited rollout and rollback capabilities | Useful locally, but insufficient for the capstone Kubernetes deployment requirement |
| C — Kubernetes/k3s | Declarative deployment, service discovery, probes, persistence, resource controls, and rollback support | More configuration files and greater operational complexity | Selected because it best satisfies the capstone deployment and DevOps requirements |

## Consequences

- **Positive:** The complete application can be deployed using version-controlled manifests. Kubernetes provides internal DNS names such as `postgres`, `kafka`, and `backend`, persistent storage, health probes, controlled rollouts, and recovery support.
- **Negative / follow-ups:** Developers must have Docker, kubectl, and an available Kubernetes/k3s environment. Local images must be imported into k3d, while release images must be published to a registry and referenced using an immutable digest.
- **NFR impact:** Improves availability, recoverability, reproducibility, security, and deployability. Readiness probes prevent traffic from reaching an unavailable application, while liveness probes allow failed containers to restart.
- **Evidence later labs will need:** Successful Kubernetes rollouts, healthy pods, bound persistent volume claims, HTTP health responses, authenticated API smoke tests, PostgreSQL persistence evidence, Kafka event evidence, an immutable image digest, and a documented rollback rehearsal.

## Links

- Context/container: `docs/architecture/`
- Backlog stories: `docs/backlog.md`
- Kubernetes manifests: `infrastructure/kubernetes/`
- CI workflow: `.github/workflows/ci.yml`
- Backend Dockerfile: `backend/Dockerfile`
- Frontend Dockerfile: `Frontend/Dockerfile`