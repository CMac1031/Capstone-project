# Northstar CRM API Contracts

## Purpose

This document defines the HTTP and Kafka contracts used by the Northstar CRM capstone. The frontend, backend, automated tests, Kubernetes smoke tests, and final demonstration must follow these contracts.

The primary demonstration fixtures are:

```text
Customer ID: CUS-1001
Customer: Amina Khan
Correlation ID: lab-request-001
Unknown customer: CUS-9999
```

## Base URLs

| Environment | Base URL |
|---|---|
| Backend port-forward | `http://localhost:8080` |
| Frontend port-forward and reverse proxy | `http://localhost:8081` |
| In-cluster backend service | `http://backend:8080` |

All request and response bodies use JSON unless a response is explicitly documented as plain text.

## Common Headers

| Header | Required | Purpose |
|---|---|---|
| `Content-Type: application/json` | Required for requests with a JSON body | Identifies the request representation |
| `Authorization: Bearer <jwt>` | Required for protected endpoints | Supplies the JWT returned by the login endpoint |
| `X-Correlation-Id` | Recommended on all API requests | Connects the HTTP request, application logs, PostgreSQL row, and Kafka event |

If `X-Correlation-Id` is supplied, the backend preserves it. If it is absent, the backend generates one. The correlation ID must be returned in the response header and included in applicable persisted records, logs, and events.

Tokens, passwords, database credentials, and kubeconfig values must never appear in committed examples, logs, screenshots, or Kafka messages.

## Security and Authorization

| Endpoint | Public | AGENT | ADMIN |
|---|---:|---:|---:|
| `POST /api/auth/login` | Yes | Yes | Yes |
| `GET /actuator/health` | Yes | Yes | Yes |
| Customer search and profile endpoints | No | Yes | Yes |
| Interaction read and write endpoints | No | Yes | Yes |
| Administrative endpoints | No | No | Yes |

Security responses have the following meanings:

| Status | Meaning |
|---:|---|
| `401 Unauthorized` | Authentication is missing, expired, invalid, or the username/password combination is incorrect |
| `403 Forbidden` | Authentication succeeded, but the authenticated user does not have the required role |

## Authentication

### Log in

```http
POST /api/auth/login
```

Authentication: public.

Request:

```json
{
  "username": "admin1",
  "password": "password123"
}
```

Successful response:

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "permission": "ADMIN",
  "jwt": "<redacted>"
}
```

Supported synthetic demonstration accounts:

| Username | Password | Permission |
|---|---|---|
| `agent1` | `password123` | `AGENT` |
| `admin1` | `password123` | `ADMIN` |

Invalid credentials:

```http
HTTP/1.1 401 Unauthorized
Content-Type: text/plain
```

```text
Invalid username or password
```

## Customers

### Search for customers

```http
GET /api/customers/search?query=Amina
Authorization: Bearer <jwt>
X-Correlation-Id: lab-request-001
```

The `query` value may contain a customer ID, customer name, or email fragment.

Successful response:

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Correlation-Id: lab-request-001
```

```json
[
  {
    "customerId": "CUS-1001",
    "name": "Amina Khan",
    "email": "amina.khan@example.com",
    "accountStatus": "ACTIVE"
  }
]
```

No matching customer returns an empty array with `200 OK`:

```json
[]
```

### Get a customer profile

```http
GET /api/customers/CUS-1001
Authorization: Bearer <jwt>
X-Correlation-Id: lab-request-001
```

Successful response:

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Correlation-Id: lab-request-001
```

```json
{
  "customerId": "CUS-1001",
  "name": "Amina Khan",
  "email": "amina.khan@example.com",
  "accountStatus": "ACTIVE"
}
```

Unknown customer:

```http
HTTP/1.1 404 Not Found
```

## Interactions

Supported interaction types are:

```text
NOTE
CALL
EMAIL
MEETING
```

### Record an interaction

```http
POST /api/v1/interactions
Authorization: Bearer <jwt>
Content-Type: application/json
X-Correlation-Id: lab-request-001
```

Request:

```json
{
  "customerId": "CUS-1001",
  "interactionType": "NOTE",
  "summary": "Discussed renewal options with Amina."
}
```

Validation rules:

| Field | Rules |
|---|---|
| `customerId` | Required and must identify an existing customer |
| `interactionType` | Required and must be `NOTE`, `CALL`, `EMAIL`, or `MEETING` |
| `summary` | Required, must not be blank, and must not exceed 2,000 characters |
| `X-Correlation-Id` | Preserved when supplied; generated when absent |

Successful response:

```http
HTTP/1.1 201 Created
Content-Type: application/json
X-Correlation-Id: lab-request-001
```

```json
{
  "interactionId": "<generated-identifier>",
  "customerId": "CUS-1001",
  "interactionType": "NOTE",
  "summary": "Discussed renewal options with Amina.",
  "correlationId": "lab-request-001",
  "createdAt": "2026-08-27T12:00:00Z"
}
```

A successful request must produce all three outcomes:

1. Return `201 Created`.
2. Insert one matching PostgreSQL interaction row.
3. Publish one matching version 1 Kafka event.

### Record an interaction for an unknown customer

Request:

```json
{
  "customerId": "CUS-9999",
  "interactionType": "NOTE",
  "summary": "This interaction must be rejected."
}
```

Expected response:

```http
HTTP/1.1 404 Not Found
```

The failed request must not insert a PostgreSQL interaction and must not publish a successful Kafka event.

### List a customer's interactions

```http
GET /api/v1/interactions?customerId=CUS-1001
Authorization: Bearer <jwt>
X-Correlation-Id: lab-request-001
```

Successful response:

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
[
  {
    "interactionId": "<generated-identifier>",
    "customerId": "CUS-1001",
    "interactionType": "NOTE",
    "summary": "Discussed renewal options with Amina.",
    "correlationId": "lab-request-001",
    "createdAt": "2026-08-27T12:00:00Z"
  }
]
```

Results are ordered from newest to oldest. A known customer with no interactions returns an empty array.

## Standard Error Contract

API validation and business errors use the following representation:

```json
{
  "timestamp": "2026-08-27T12:00:00Z",
  "status": 404,
  "error": "Not Found",
  "message": "Customer not found: CUS-9999",
  "path": "/api/v1/interactions",
  "correlationId": "lab-request-001",
  "violations": []
}
```

Validation example:

```json
{
  "timestamp": "2026-08-27T12:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Request validation failed",
  "path": "/api/v1/interactions",
  "correlationId": "lab-request-001",
  "violations": [
    {
      "field": "summary",
      "message": "must not be blank"
    }
  ]
}
```

| Status | Situation |
|---:|---|
| `400 Bad Request` | Missing field, blank summary, summary over 2,000 characters, malformed JSON, or unsupported interaction type |
| `401 Unauthorized` | Missing or invalid authentication, or invalid login credentials |
| `403 Forbidden` | Authenticated user lacks the required role, or the request origin is rejected by CORS |
| `404 Not Found` | Requested customer or resource does not exist |
| `409 Conflict` | A uniqueness or application-state conflict prevents the operation |
| `500 Internal Server Error` | Unexpected server failure; sensitive implementation details must not be returned |

## Kafka Event Contract

| Property | Contract |
|---|---|
| Topic | `crm.customer.interactions.v1` |
| Record key | `customerId` |
| Event type | `CustomerInteractionRecorded` |
| Event version | `1` |
| Partitions | `3` in the capstone environment |
| Ordering | Preserved per customer because `customerId` is the record key |

Event payload:

```json
{
  "eventType": "CustomerInteractionRecorded",
  "eventVersion": 1,
  "interactionId": "<generated-identifier>",
  "customerId": "CUS-1001",
  "interactionType": "NOTE",
  "summary": "Discussed renewal options with Amina.",
  "correlationId": "lab-request-001",
  "occurredAt": "2026-08-27T12:00:00Z"
}
```

The Kafka event must contain the same interaction ID, customer ID, interaction type, summary, and correlation ID as the accepted API request and persisted PostgreSQL record.

Consumers must tolerate additional fields so compatible fields can be added without breaking version 1 consumers. A breaking schema change requires a new event version and topic.

## CORS Contract

For the local demonstration, the backend accepts requests originating from:

```text
http://localhost:8081
```

Allowed methods:

```text
GET
POST
OPTIONS
```

Allowed request headers:

```text
Authorization
Content-Type
X-Correlation-Id
```

The preferred Kubernetes frontend configuration uses the Nginx reverse proxy so browser requests remain on `http://localhost:8081` and `/api` requests are forwarded to the in-cluster `backend:8080` service.

## Compatibility and Versioning

- Versioned business endpoints use the `/api/v1` prefix.
- Optional response fields may be added without changing the API version.
- Existing field meanings and types must not change within version 1.
- Removing or renaming a field requires a new API or event version.
- The frontend and backend images deployed together must implement compatible contracts.

## Contract Verification

Before committing this document, compare it with the implemented controller mappings:

```bash
grep -RInE \
  '@(RequestMapping|GetMapping|PostMapping|PutMapping|DeleteMapping)' \
  backend/src/main/java
```

Compare the request and response field names:

```bash
grep -RInE \
  'record .*Request|record .*Response|class .*Request|class .*Response' \
  backend/src/main/java
```

If an implemented controller path or JSON field differs, the frontend, backend tests, and this document must be updated to one agreed contract before merging.

## Smoke-Test Acceptance

The API contract is demonstrated successfully when:

1. `admin1` or `agent1` can obtain a JWT.
2. A protected request without a JWT returns `401`.
3. A valid user with the wrong role receives `403` where applicable.
4. Searching for Amina returns `CUS-1001`.
5. A valid interaction request returns `201`.
6. The interaction exists in PostgreSQL.
7. A matching version 1 event exists in Kafka.
8. The API response, database row, logs, and Kafka event share the same correlation ID.
9. An interaction for `CUS-9999` returns `404` without a database insert or successful Kafka event.
