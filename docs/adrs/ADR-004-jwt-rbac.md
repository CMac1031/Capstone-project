# ADR-004: Secure the API using JWT and role-based access control

- **Status:** Accepted
- **Date:** 2026-08-25
- **Deciders:** Team A, Pretty Nice Code(PNC)
- **Related backlog:** CAP-04

## Context

Northstar CRM contains customer information and interaction history that must not be accessible anonymously.

The React frontend must authenticate users before accessing protected API endpoints. The backend must distinguish between:

- Anonymous or invalid authentication
- Authenticated users with insufficient permissions
- Authorized users

The application currently supports the roles:

- `AGENT`
- `ADMIN`

The deployment must remain stateless and must not store JWT signing secrets in Git, Dockerfiles, frontend code, or Kubernetes manifests.

## Decision

We will secure the Spring Boot API using JSON Web Tokens and role-based access control.

The backend will:

- Permit `/api/auth/login`
- Permit Actuator health endpoints used by Kubernetes probes
- Require authentication for other API routes
- Allow `AGENT` and `ADMIN` users to read permitted customer data
- Restrict administrative operations to `ADMIN`
- Return `401 Unauthorized` for missing, expired, or invalid tokens
- Return `403 Forbidden` for authenticated users without the required role
- Use stateless Spring Security configuration
- Store the JWT signing secret outside source control
- Receive the signing secret through environment variables or Kubernetes Secrets

The frontend may store and send the token, but authorization decisions will always be enforced by the backend.

The current capstone deployment may use an HMAC signing secret for local demonstration. A managed identity provider with asymmetric keys and rotation is the recommended production approach.

## Alternatives considered

| Option | Pros | Cons | Why not |
| ------ | ---- | ---- | ------- |
| A — JWT with Spring Security RBAC | Stateless, works with React, and supports role claims | Requires careful expiration, signing-secret protection, and validation | Selected because it fits the current architecture and capstone requirements |
| B — Server-side HTTP sessions | Mature security model and simple token revocation | Requires shared session storage when scaling and introduces CSRF considerations | The application is designed as a stateless API |
| C — External identity provider with OAuth2/OIDC | Key rotation, standardized authentication, and centralized identity management | Additional infrastructure and configuration complexity | Recommended for production, but outside the current capstone timebox |

## Consequences

- **Positive:** Protected data requires authentication, and privileged behavior can be restricted by role. Stateless authentication supports multiple backend replicas.
- **Negative / follow-ups:** Token revocation is not immediate, signing secrets must be rotated, CORS must be restricted, and tokens must never be exposed in logs or screenshots.
- **NFR impact:** Improves confidentiality, authorization, scalability, and security auditability.
- **Evidence later labs will need:** Successful login, authorized request evidence, anonymous `401`, wrong-role `403`, automated authorization tests, expired or invalid token testing, and proof that no JWT secret is committed.

## Links

- Context/container: `docs/architecture/`
- Backlog stories: `docs/backlog.md`
- Security configuration: `backend/src/main/java/com/northstar/crm/security/SecurityConfig.java`
- JWT filter: `backend/src/main/java/com/northstar/crm/security/JwtAuthenticationFilter.java`
- JWT service: `backend/src/main/java/com/northstar/crm/security/JwtService.java`
- Login controller: `backend/src/main/java/com/northstar/crm/security/AuthController.java`