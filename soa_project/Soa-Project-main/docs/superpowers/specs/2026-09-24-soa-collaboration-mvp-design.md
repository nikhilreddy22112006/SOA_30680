# SOA Collaboration Platform MVP Design

## Goal

Deliver a locally runnable, faculty-demonstrable software-engineering collaboration platform with three independently deployable business microservices, secure access, service discovery, API routing, database-per-service, and a controlled AI-assistant workflow for issue management.

## Scope

The MVP implements the approved three business services:

1. **Auth Service**: registration, login, BCrypt password hashing, JWT issuing, and role claims for `ADMIN`, `MANAGER`, `DEVELOPER`, and `TESTER`.
2. **Project Service**: project creation, listing, project membership, and ownership/access checks.
3. **Issue Service**: issue creation, listing and filtering, assignment, status updates, comments, and a controlled assistant endpoint that can search or create issues.

Two infrastructure applications support them:

- **Eureka Server** discovers registered services.
- **API Gateway** exposes one frontend-facing API and routes to the business services.

The frontend is a React dashboard that supports sign-in, projects, issues, and the assistant panel. It is intentionally a usable, coherent demonstration rather than a complete Jira clone.

Out of scope for this MVP are a standalone Sprint Service, Notification Service, Kafka, file attachments, refresh tokens, real-time updates, and unrestricted LLM/database access. Those are planned extensions once the baseline demonstrably works.

## Architecture

The platform uses Java 21 and Spring Boot 3.x. Each Spring Boot service has its own H2 database by default so the project runs without external infrastructure; Spring profiles make replacing each H2 database with PostgreSQL straightforward for final deployment. Each service registers in Eureka. The gateway routes `/api/auth/**`, `/api/projects/**`, and `/api/issues/**` to their matching services.

The React/Vite client calls only the gateway. It stores the JWT in memory/local storage for the demo and attaches it to protected calls. Each backend service independently verifies JWT signature and role claims, avoiding a shared session database.

```text
React client -> API Gateway -> Auth Service    -> auth database
                          -> Project Service -> project database
                          -> Issue Service   -> issue database
                                         \-> controlled assistant actions

All applications -> Eureka Server
```

## Data and API Boundaries

Auth owns users and credentials. Project owns projects and memberships. Issue owns issues and comments. Services do not use cross-service foreign keys. An issue records `projectId` and assignee information as validated API data rather than a relational cross-database reference.

Core APIs:

- `POST /api/auth/register`, `POST /api/auth/login`
- `GET|POST /api/projects`, `POST /api/projects/{id}/members`
- `GET|POST /api/issues`, `PATCH /api/issues/{id}`, `POST /api/issues/{id}/comments`
- `POST /api/issues/assistant` accepts a narrowly defined natural-language command and maps it to safe issue search/create operations.

## Controlled AI Assistant

The first runnable version offers deterministic command interpretation for examples such as “show critical open issues” and “create a high priority login bug.” It calls the same service-layer functions as ordinary REST endpoints, validates the caller’s role and requested project, and records the action.

An `AiProvider` interface isolates model vendors. Runtime configuration selects one of three real integrations: Google Gemini (`GEMINI_API_KEY`), OpenRouter’s OpenAI-compatible API (`OPENROUTER_API_KEY` and `OPENROUTER_MODEL`), or NVIDIA NIM’s OpenAI-compatible API (`NVIDIA_NIM_API_KEY` and `NVIDIA_NIM_MODEL`). No vendor key is committed to source control. When no provider credentials are configured, the deterministic parser remains active so a fresh clone can still complete the full demo. The selected model receives only the user command and narrowly scoped issue/project context; every state-changing tool call is still validated and executed by application code. The model never connects directly to a database.

## Security and Error Handling

Passwords are BCrypt hashed. JWTs have a configurable signing secret and expiry. Unauthorized requests return `401`; authenticated requests without the required role return `403`; invalid requests return structured `400` responses; unknown resources return `404`. CORS allows the local React dev URL in the development profile. Input uses Jakarta validation and issue status is restricted to the defined workflow.

## Run and Demonstration Flow

One command starts required infrastructure and services, and one command starts the React UI. The demo flow is: register/sign in as Manager, create a project, add a member, create and assign an issue, update it from Open to In Progress, ask the assistant to find critical issues, and show its controlled result.

## Testing and Acceptance Criteria

Automated backend tests cover authentication, authorization, project creation, issue workflow validation, and assistant command parsing. Frontend checks cover API client behavior and primary view rendering. A smoke script verifies Eureka, gateway routing, service health, and the primary API flow.

The MVP is accepted when a fresh developer can follow the README to run the system locally, complete the demonstration flow through the browser, and see all protected behavior routed through the gateway.
