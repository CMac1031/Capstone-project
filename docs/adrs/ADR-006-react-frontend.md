# ADR-006: Use React and TypeScript for the frontend

- **Status:** Accepted
- **Date:** 2026-08-26
- **Deciders:** Team A, Pretty Nice Code(PNC)
- **Related backlog:** CAP-06

## Context

Northstar CRM requires a browser-based interface that allows authenticated users to:

- Log in to the application
- Search for customers
- View customer profiles
- View account information
- Record customer interactions
- Display loading, empty, and error states
- Send JWTs with protected API requests

The frontend must integrate with the Spring Boot REST API and must be testable, maintainable, and deployable as a container.

The application contains multiple reusable interface elements, including navigation, login, search, customer profile, and account components. A component-based frontend architecture is appropriate for these requirements.

## Decision

We will build the Northstar CRM frontend using React and TypeScript.

The frontend will use:

- React for component-based user-interface development
- TypeScript for static type checking
- Vite for development and production builds
- React hooks for authentication and application state
- The browser Fetch API for backend communication
- Vitest and React Testing Library for frontend testing
- ESLint for static code-quality checks
- Nginx for serving the production frontend
- An Nginx reverse proxy for forwarding `/api/` requests to the backend Kubernetes Service

The frontend will call relative API paths such as:

```text
/api/auth/login
/api/customers
/api/v1/interactions
