# Northstar CRM Backend — Implementation Summary

Date: 2026-08-23
Author: Andy

---

## 1. Interaction (Customer Interaction Records)

| File | Role |
|---|---|
| `Interaction.java` | Entity mapped to the `customer_interaction` table. Fields: id, customerId, interactionType, summary, correlationId, createdAt. No setters (immutable) |
| `CreateInteractionRequest.java` | Request DTO. customerId, interactionType (validated as `CALL\|EMAIL\|NOTE\|MEETING`), summary, correlationId |
| `InteractionResponse.java` | Response DTO |
| `InteractionRepository.java` | Extends `JpaRepository<Interaction, UUID>`. Basic CRUD plus a query method for fetching by customerId sorted by date |
| `InteractionService.java` | Core logic. Resolves correlationId (header → request body → default), verifies the customer exists, saves to DB, publishes an event via `ApplicationEventPublisher` |
| `InteractionController.java` | `POST /api/v1/interactions` |
| `V1__customer_interaction.sql` | Flyway migration. Creates the table and seeds CUS-1001/CUS-1002 (CUS-9999 intentionally omitted for failure-path testing) |

---

## 2. Customer API

| File | Role |
|---|---|
| `Customer.java` | Entity. customerId (PK, String), name, email, phone, accountStatus. Has setters (editable) |
| `CustomerRepository.java` | Extends `JpaRepository<Customer, String>` |
| `CustomerService.java` | listCustomerIds(), getCustomer(id), updateCustomer(...) |
| `CustomerController.java` | `GET /api/customers`, `GET /api/customers/{id}`, `PATCH /api/customers/{id}` |
| `V2__customer.sql` | Creates the table and seeds CUS-1001 (Amina Khan), CUS-1002 (Daniel Cho) |

---

## 3. Kafka Messaging — Producer (Andy)

| File | Role |
|---|---|
| `InteractionEventPublisher.java` | Uses `@TransactionalEventListener(phase = AFTER_COMMIT)` so Kafka publish only fires after the DB transaction commits |
| `CustomerInteractionRecordedV1.java` | Versioned event contract: eventId, eventType, eventVersion (int), interactionId, customerId, interactionType, correlationId, occurredAt |
| `InteractionTopics.java` | Topic name constants (`crm.customer.interactions.v1`, `.dlq`) |
| `InteractionCreatedEvent.java` | Internal Spring event used to trigger the publish step after commit |

## 3-1. Kafka Messaging — Consumer (Michael, merged in)

| File | Role |
|---|---|
| `InteractionEventListener.java` | `@KafkaListener` that consumes events. Validates the contract (key matches customerId, eventVersion, eventType, interactionType) before processing (currently logs it) |
| `ContractViolationException.java` | Non-retryable error — routed straight to the DLQ |
| `KafkaConsumerErrorConfig.java` | Retries twice at 500ms intervals, then routes to the dead-letter topic |
| `KafkaTopicConfig.java` | Auto-creates the DLQ topic on startup |
| `ProcessedEventStore.java` | Deduplicates by eventId (in-memory — resets on restart, a known limitation) |

---

## 4. Error Handling

| File | Role |
|---|---|
| `ApiExceptionHandler.java` | `@RestControllerAdvice`. Converts `CustomerNotFoundException` into a 404 response using RFC 9457 Problem Detail format |
| `CustomerNotFoundException.java` | Thrown when a request references a customer ID that doesn't exist |

---

## 5. JWT / RBAC Security

| File | Role |
|---|---|
| `User.java` | Login account entity mapped to `app_user`. username (PK), passwordHash, role (`ADMIN`/`AGENT`) |
| `V3__users.sql` | Creates the table and seeds agent1/admin1 accounts (password: password123, stored as a BCrypt hash) |
| `UserRepository.java` | Extends `JpaRepository<User, String>` |
| `CrmUserDetailsService.java` | Implements `UserDetailsService`. Looks up accounts via `UserRepository` and converts them into Spring Security's `UserDetails` format |
| `JwtService.java` | Issues (`generateToken`) and validates (`parseToken`, `extractUsername`, `extractRole`) JWTs. HS256, 1-hour expiration. Secret is injected from the `${JWT_SECRET}` environment variable — never hardcoded or committed |
| `JwtAuthenticationFilter.java` | Extends `OncePerRequestFilter`. On every request, validates the Bearer token from the Authorization header and sets authentication on `SecurityContextHolder`. Does not block the request itself when the token is missing/invalid — it just lets it pass through unauthenticated |
| `SecurityConfig.java` | Defines the `SecurityFilterChain`: stateless sessions, CSRF disabled, route rules (`/api/auth/login` permitAll, `/api/customers/**` requires AGENT/ADMIN, everything else requires authentication), explicit 401 (unauthenticated) vs 403 (wrong role) handling, and places the JWT filter in the chain |
| `AuthController.java` | `POST /api/auth/login`. Verifies username/password and issues a JWT. Response shape is `{ permission, jwt }`, matching the frontend's `AuthTypes.ts` |

---

## 6. Infrastructure

| File | Role |
|---|---|
| `docker-compose.yml` | Local dev containers for Postgres 16 and Kafka 3.7.0 (KRaft mode) |
| `application.yml` | Datasource, JPA (`ddl-auto: validate`), Flyway, Kafka producer/consumer (JSON serialization), JWT secret config |

---

## 6-1. JWT_SECRET Environment Variable (Important — read this)

The signing key `JwtService.java` uses is **not hardcoded anywhere in the code or in `application.yml`**. `application.yml` only has:

```yaml
jwt:
  secret: ${JWT_SECRET}
```

The real value comes from an environment variable on each person's own machine. Without it set, the server won't start (it'll error out).

**Why it's set up this way**: if the secret were committed to git, anyone could forge a valid-looking token and the whole auth system would be worthless. The capstone rubric also explicitly docks points for committed secrets.

### How to set it up locally (Windows / PowerShell)

1. Generate a secret (do this once — the whole team needs to use the **same** value, otherwise a token issued by one person's server won't validate on someone else's):
   ```powershell
   [System.Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
   ```
2. Share the resulting value with the team through a private channel (Slack DM, private doc, etc.)
3. Set it as a permanent environment variable on your machine:
   ```powershell
   [System.Environment]::SetEnvironmentVariable("JWT_SECRET", "paste_the_shared_value_here", "User")
   ```
4. **Open a new PowerShell window** for it to take effect (existing terminals/IDEs need to be restarted)
5. Verify it's set:
   ```powershell
   echo $env:JWT_SECRET
   ```

### Notes

- Never commit this value to git (if using a `.env` file, make sure it's in `.gitignore`)
- Don't paste it into the README, commit messages, or any public channel
- This document intentionally does not contain the actual secret value — that only goes through a private team channel

---

## 7. Tests

| File | Role |
|---|---|
| `InteractionServiceTest.java` | Mockito-based unit tests: successful save when the customer exists, exception thrown when it doesn't |
| `InteractionEventPublisherTest.java` | Uses `ArgumentCaptor` to verify the Kafka publish call uses the correct topic, key, and payload |

---

## 8. What's Been Verified End-to-End

- `POST /api/v1/interactions` — confirmed real writes to Postgres (both the CUS-1001 success case and the CUS-9999 failure case)
- Producer → Kafka → Consumer pipeline — confirmed working end-to-end (consumer logs show `interaction_event_processed`)
- `GET /api/customers`, `GET /api/customers/{id}` — confirmed working
- Login (`POST /api/auth/login`) — confirmed JWT issuance
- Auth matrix — confirmed: no token → 401, valid token → 200, forged token → 401

---

## 9. Remaining Work

- Frontend integration (no Vite proxy configured yet, and the frontend calls `/api/login` while the backend exposes `/api/auth/login` — needs to be reconciled)
- Refresh token / longer-session support not implemented
- `docs/backend-demo.md` and the git commit/push — owned by another teammate
- Docker image build, k3s deployment, CI/CD pipeline (rest of Module 51's scope)