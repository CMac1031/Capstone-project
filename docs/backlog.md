# Northstar CRM Capstone Backlog

This backlog prioritizes vertical stories that produce demonstrable user or operational outcomes across the React frontend, Spring Boot backend, PostgreSQL database, Kafka messaging, security, CI/CD, and Kubernetes deployment.

The primary demonstration data is:

```text
Customer ID: CUS-1001
Customer: Amina Khan
Correlation ID: lab-request-001
```

## Prioritized Stories

| ID     | Story                                     | Priority | Acceptance criteria                                                                                                                                                                                                                                                                                                                                                                                             | Owner                                        | Lab |
| ------ | ----------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | --- |
| CAP-12 | Record a customer interaction             | P0       | An authenticated AGENT or ADMIN can submit a valid `POST /api/v1/interactions` request for Amina (`CUS-1001`) using correlation ID `lab-request-001`; the API returns 201, one PostgreSQL interaction row is created, and one versioned Kafka event is published with the matching interaction ID, customer ID, and correlation ID.                                                                             | Backend Lead + Christopher                   | 49  |
| CAP-13 | Search for and open a customer profile    | P0       | An authenticated user can search for Amina by name or `CUS-1001`, open the correct customer profile, and view persisted customer information and the interaction timeline through the React frontend.                                                                                                                                                                                                           | Frontend Lead                                | 50  |
| CAP-14 | Secure and deploy an identifiable release | P0       | A request without a valid JWT returns 401; an authenticated user without the required role receives 403; authorized AGENT and ADMIN requests succeed; GitHub Actions passes; backend and frontend images are tagged with the Git commit SHA; the pinned release deploys successfully to the SWE2 k3s `student16` namespace; and rollback to the previous image is documented and completed within five minutes. | Christopher — DevOps + Backend/Security Lead | 51  |
| CAP-15 | Demonstrate the completed CRM slice       | P1       | A 10–15 minute demonstration proves login, customer search, profile display, successful interaction creation, PostgreSQL persistence, Kafka publication, matching correlation ID, unknown-customer failure behavior, automated tests, GitHub Actions, healthy Kubernetes workloads, and rollback evidence.                                                                                                      | Entire Team                                  | 52  |

## Definition of Done

A backlog story is complete only when:

* Every acceptance criterion has been demonstrated.
* Relevant backend and frontend automated tests pass.
* GitHub Actions passes for the affected components.
* No secrets, kubeconfigs, complete JWTs, or real customer PII are committed or included in evidence.
* Required code and documentation have been reviewed.
* Evidence is saved or linked from `Defense/evidence-index.md`.
* The feature works from the integrated `main` branch.
* The deployed release uses an immutable Git SHA tag or image digest.
* Any known limitation or failed target is documented with an owner and remediation plan.

## Priority Definitions

| Priority | Meaning                                                                                      |
| -------- | -------------------------------------------------------------------------------------------- |
| P0       | Required for the minimum complete capstone workflow                                          |
| P1       | Required for final demonstration quality, failure handling, recovery, or supporting evidence |
| P2       | Optional improvement attempted only after all P0 and P1 stories are complete                 |

## Out of Scope

* Billing and payment processing
* Real customer personally identifiable information
* Production identity-provider configuration
* Customer deletion
* Multi-region disaster recovery
* Production-scale Kafka clustering
* Production database backup automation
* Features unrelated to the Labs 49–52 customer-interaction slice
