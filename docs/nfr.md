# Non-Functional Requirements — Northstar CRM

## Purpose

These non-functional requirements define measurable quality targets for the Northstar CRM capstone across local development, GitHub Actions, and the shared SWE2 training k3s environment. A requirement is complete only when its measurement evidence has been recorded and linked from the final evidence index.

## Requirements

| ID | Category | Measurable target | Verification method | Target environment |
|---|---|---|---|---|
| NFR-01 | Performance | The p95 response time for `POST /api/v1/interactions` must be no more than 500 ms during a 100-request test with 10 concurrent users, with an error rate below 1%. | JMeter or equivalent report containing request count, concurrency, p50, p95, maximum response time, throughput, and error rate | Local integrated environment or SWE2 training k3s with one backend replica, PostgreSQL, and Kafka |
| NFR-02 | Authentication and authorization | An unauthenticated protected request must return 401; an authenticated user without the required role must return 403; an authorized AGENT or ADMIN request to create a valid interaction must return 201. | Automated Spring Security tests plus sanitized `curl` output for the 401/403/201 matrix | GitHub Actions and SWE2 training k3s |
| NFR-03 | Availability and recovery | Backend startup, readiness, and liveness endpoints must return HTTP 200 while the service is healthy. A failed backend release must be restored to the previous working immutable image within five minutes. | `curl` health checks, probe status, `kubectl rollout status`, pod events, and a timed rollback rehearsal | SWE2 training k3s |
| NFR-04 | Accessibility | Login, customer search, profile, and interaction workflows must be operable by keyboard, use programmatically associated labels, display understandable errors, and achieve a Lighthouse accessibility score of at least 90. | Lighthouse accessibility report and a documented keyboard-only walkthrough | Containerized frontend accessed through Chrome |
| NFR-05 | Privacy and secret protection | Only synthetic customer data may be used. JWTs, passwords, database credentials, kubeconfigs, service-account tokens, and real customer PII must not appear in Git, CI logs, screenshots, or submitted evidence. Capstone test data and temporary access artifacts must be removed within seven days after the final demonstration. | Git-history review, secret scan, log review, screenshot review, and signed cleanup checklist | GitHub, GitHub Actions, developer workstations, and SWE2 training k3s |
| NFR-06 | Data integrity | Every accepted interaction must reference an existing customer. Customer emails must be unique, and account status, interaction type, and application role values must be constrained to the supported sets. | Flyway history verification, schema inspection, and negative PostgreSQL constraint tests | PostgreSQL container and SWE2 training k3s |
| NFR-07 | Messaging reliability | Every successful interaction smoke-test request must create one PostgreSQL row and publish a Kafka event containing the same interaction ID, customer ID, and correlation ID. A rejected request must not publish a successful interaction event. | SQL query and Kafka consumer output matched by interaction ID and correlation ID, including one failure-path check | SWE2 training k3s |
| NFR-08 | Build quality | Backend tests, frontend lint, frontend tests, frontend build, and both container image builds must pass before a release is accepted into `main`. Failed required jobs must block acceptance. | Green GitHub Actions run URL showing backend, frontend, and image jobs | GitHub Actions |
| NFR-09 | Deployability | PostgreSQL, Kafka, backend, and frontend workloads must become ready within five minutes after applying a valid release, excluding first-time base-image download. PostgreSQL and Kafka PVCs must become `Bound`. | Timed `kubectl apply`, `kubectl rollout status`, `kubectl get pods`, and `kubectl get pvc` output | SWE2 training k3s |
| NFR-10 | Observability | Interaction requests must accept or generate a correlation ID that can be matched across the API response, backend log, PostgreSQL record, and Kafka event. Secrets and complete JWTs must never be logged. | One evidence chain containing the same sanitized correlation ID in the response, log, SQL output, and Kafka message | Local integrated environment and SWE2 training k3s |
| NFR-11 | Release traceability | Backend and frontend releases must be tagged with the Git commit SHA. The deployed Kubernetes manifests must reference immutable SHA tags or image digests, and the previous working identities must be retained for rollback. | GitHub Actions output, GHCR package metadata, committed manifests, and `kubectl` image/image-ID output | GitHub Actions, GHCR, and SWE2 training k3s |
| NFR-12 | Resource control | Every application container must declare CPU and memory requests and limits. Under the capstone smoke workload, no container may be OOM-killed or enter a restart loop. | Manifest review plus `kubectl describe pod` and restart-count evidence | SWE2 training k3s |

## Evidence Status

| NFR | Current status | Remaining evidence |
|---|---|---|
| NFR-01 | Pending | Run and save the 100-request, 10-user performance test |
| NFR-02 | In progress | Record the complete automated and deployed 401/403/201 matrix |
| NFR-03 | In progress | SWE2 probes and HTTP 200 are demonstrated; perform and time an actual rollback |
| NFR-04 | Pending | Save Lighthouse results and keyboard-only walkthrough notes |
| NFR-05 | In progress | Complete final Git, CI, log, and screenshot secret review and post-demo cleanup record |
| NFR-06 | Demonstrated | Link Flyway history and negative constraint-test evidence |
| NFR-07 | Demonstrated | Link the `k8s-smoke-001` SQL/Kafka correlation evidence and add the rejected-request check |
| NFR-08 | Demonstrated | Record the successful `main` Actions run URL and confirm required branch protection |
| NFR-09 | Demonstrated | Save the SWE2 rollout, four healthy pods, and two bound PVC outputs with timing |
| NFR-10 | Demonstrated | Consolidate the `k8s-smoke-001` response, log, SQL, and Kafka evidence |
| NFR-11 | Pending | Replace `:latest` with immutable SHA tags or digests and record deployed identities |
| NFR-12 | Demonstrated | Link manifest resource settings and zero-restart healthy-pod output |

## Acceptance and Evidence Rules

- Evidence must come from the environment identified in the requirement.
- Tokens, credentials, kubeconfig contents, and authentication-enabling hashes must be redacted.
- Screenshots must show enough surrounding context to identify the command, environment, and result.
- A successful command without saved output or a durable evidence link is not considered final evidence.
- If a target is missed, record the measured result, cause, owner, risk, and planned remediation rather than marking it complete.
- Changes to an NFR target require team agreement and a documented rationale.
- Results must not be retroactively adjusted to match an unsuccessful test.

## Final Evidence Mapping

Each completed NFR should be referenced from `Defense/evidence-index.md`.

| Claim | Evidence artifact | Location |
|---|---|---|
| NFR-03 health target met | Backend health and pod-readiness capture | `Defense/evidence/lab51-health.txt` |
| NFR-08 build gate met | Successful GitHub Actions run | GitHub Actions run URL |
| NFR-11 immutable release deployed | SHA-tagged manifest and Kubernetes image ID | `Defense/evidence/lab51-release.txt` |