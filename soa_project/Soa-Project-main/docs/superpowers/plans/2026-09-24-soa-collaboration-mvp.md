# SOA Collaboration MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and run a three-business-service SOA collaboration platform with a React dashboard and controlled, provider-configurable AI issue assistant.

**Architecture:** A Maven multi-module workspace hosts Eureka, Gateway, Auth, Project, and Issue Spring Boot applications. Each business service uses an isolated H2 database in the runnable development profile and independently validates shared JWT claims. A React/Vite dashboard consumes only gateway APIs. Issue Service provides the tool boundary and calls the selected Gemini, OpenRouter, or NVIDIA NIM adapter only for language interpretation.

**Tech Stack:** Java 21, Spring Boot 3, Spring Cloud, Spring Security, JJWT, Spring Data JPA, H2, Maven, React 18, TypeScript, Vite, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-24-soa-collaboration-mvp-design.md`

## Global Constraints

- Java 21 and Node 20 are required.
- A business service owns only its own H2 schema; no cross-service foreign keys exist.
- All browser API calls go through Gateway at `http://localhost:8080`.
- JWT signing secret, CORS origin, and AI provider credentials come only from environment/configuration, never source control.
- AI models cannot access databases or invoke an endpoint directly; app code validates every tool action.
- With no AI credential, deterministic assistant commands must keep the demo fully runnable.

## Review Focus

- Expired, malformed, or tampered JWT must receive `401`, not a server error.
- A `DEVELOPER` cannot create a project or change project membership.
- An invalid issue-status transition must receive `400` and leave the stored issue unchanged.
- AI text that resembles a create command must not mutate state until its parsed fields pass validation.
- A missing provider key must select the deterministic adapter rather than prevent service startup.

### Task 1: Workspace and shared contracts

**Files:**
- Create: `pom.xml`, `README.md`, `.gitignore`, `docker-compose.yml`
- Create: `common/src/main/java/com/soa/common/security/JwtService.java`
- Create: `common/src/main/java/com/soa/common/api/ApiError.java`
- Test: `common/src/test/java/com/soa/common/security/JwtServiceTest.java`

**Interfaces:**
- Produces `JwtService.issue(UserIdentity)` and `JwtService.parse(String): UserIdentity`.
- Produces `ApiError(code, message, timestamp)` for all services.

- [ ] Write tests that issue a token, parse its subject/roles, and reject malformed or expired tokens.
- [ ] Run `mvn -pl common test`; verify the initial tests fail because `JwtService` is absent.
- [ ] Create Maven parent/module configuration, Java 21 compiler configuration, shared API error type, and HMAC JWT implementation using environment-backed `APP_JWT_SECRET`.
- [ ] Re-run `mvn -pl common test`; verify token tests pass.
- [ ] Add README prerequisites, service ports, configuration example, and run commands; add `.env` to `.gitignore`.

### Task 2: Service discovery and gateway

**Files:**
- Create: `eureka-server/pom.xml`, `eureka-server/src/main/java/.../EurekaServerApplication.java`, `eureka-server/src/main/resources/application.yml`
- Create: `api-gateway/pom.xml`, `api-gateway/src/main/java/.../GatewayApplication.java`, `api-gateway/src/main/resources/application.yml`
- Test: `api-gateway/src/test/java/.../GatewayRouteConfigurationTest.java`

**Interfaces:**
- Consumes Eureka application names `auth-service`, `project-service`, and `issue-service`.
- Produces routes `/api/auth/**`, `/api/projects/**`, and `/api/issues/**`.

- [ ] Write a route configuration test asserting each public prefix routes to the matching discovery URI.
- [ ] Run the gateway test and verify it fails before routes are defined.
- [ ] Implement Eureka and Gateway applications, configure ports 8761 and 8080, service registration, health endpoints, and CORS origin `http://localhost:5173`.
- [ ] Re-run the gateway test and start both apps; verify `GET /actuator/health` returns `UP` for each.

### Task 3: Auth Service

**Files:**
- Create: `auth-service/src/main/java/.../AuthServiceApplication.java`
- Create: `auth-service/src/main/java/.../user/{User,Role,UserRepository,AuthService,AuthController}.java`
- Create: `auth-service/src/main/resources/application.yml`
- Test: `auth-service/src/test/java/.../AuthControllerTest.java`

**Interfaces:**
- Produces `POST /api/auth/register {name,email,password,role}` and `POST /api/auth/login {email,password}`.
- Produces `{token,user:{id,name,email,role}}` on successful login.

- [ ] Write controller tests for successful registration/login, duplicate email `409`, and incorrect password `401`.
- [ ] Run `mvn -pl auth-service test` and verify failure before implementation.
- [ ] Implement H2-owned user persistence, BCrypt hashing, request validation, role allow-list, JWT issuance, standardized errors, Eureka registration, and seed-free startup.
- [ ] Re-run Auth tests; start the service and verify it appears in Eureka.

### Task 4: Project Service

**Files:**
- Create: `project-service/src/main/java/.../ProjectServiceApplication.java`
- Create: `project-service/src/main/java/.../project/{Project,ProjectMember,ProjectRepository,ProjectService,ProjectController}.java`
- Create: `project-service/src/main/java/.../security/JwtAuthenticationFilter.java`
- Test: `project-service/src/test/java/.../ProjectControllerTest.java`

**Interfaces:**
- Consumes bearer JWT with `sub`, `userId`, and `roles` claims.
- Produces `GET|POST /api/projects` and `POST /api/projects/{id}/members`.

- [ ] Write failing tests for Manager project creation, Developer `403`, project listing, and owner-only membership additions.
- [ ] Implement isolated project/member schema, JWT filter, method-level authorization, ownership checks, and validation.
- [ ] Run Project tests and verify all cases pass; verify requests work through `http://localhost:8080/api/projects`.

### Task 5: Issue Service and workflow

**Files:**
- Create: `issue-service/src/main/java/.../IssueServiceApplication.java`
- Create: `issue-service/src/main/java/.../issue/{Issue,Comment,IssueStatus,IssueRepository,IssueService,IssueController}.java`
- Create: `issue-service/src/main/java/.../security/JwtAuthenticationFilter.java`
- Test: `issue-service/src/test/java/.../IssueServiceTest.java`

**Interfaces:**
- Produces `GET|POST /api/issues`, `PATCH /api/issues/{id}`, and `POST /api/issues/{id}/comments`.
- `IssueStatus` values: `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `TESTING`, `RESOLVED`, `CLOSED`.

- [ ] Write failing tests for creation, severity/status filtering, allowed update, forbidden update, and invalid status rejection without persistence change.
- [ ] Implement issue/comment entities, request DTOs, filtering, role checks, status transition rules, and structured error handling.
- [ ] Run Issue tests and verify service discovery plus gateway routing works.

### Task 6: Provider-configurable AI assistant

**Files:**
- Create: `issue-service/src/main/java/.../assistant/{AiProvider,DeterministicAiProvider,GeminiAiProvider,OpenAiCompatibleProvider,AssistantService,AssistantController}.java`
- Create: `issue-service/src/main/java/.../assistant/{AssistantRequest,AssistantResponse,AssistantAction}.java`
- Modify: `issue-service/src/main/resources/application.yml`
- Test: `issue-service/src/test/java/.../assistant/AssistantServiceTest.java`

**Interfaces:**
- Produces `POST /api/issues/assistant {command,projectId?}`.
- `AiProvider.interpret(command, context): AssistantAction` returns `SEARCH` or `CREATE`; only `AssistantService` invokes IssueService methods.

- [ ] Write failing tests for deterministic critical-issue search, valid create intent, invalid create fields, and default provider selection when no key exists.
- [ ] Implement the deterministic parser and safe action executor.
- [ ] Implement Gemini adapter using `GEMINI_API_KEY`, OpenRouter adapter using `OPENROUTER_API_KEY`/`OPENROUTER_MODEL`, and NVIDIA NIM adapter using `NVIDIA_NIM_API_KEY`/`NVIDIA_NIM_MODEL`; select via `AI_PROVIDER=gemini|openrouter|nvidia|deterministic`.
- [ ] Make the adapters return a typed action, not arbitrary code or SQL; validate/authorize it before mutation.
- [ ] Run assistant tests with no AI key and verify deterministic behavior passes.

### Task 7: React dashboard

**Files:**
- Create: `web/package.json`, `web/vite.config.ts`, `web/src/main.tsx`, `web/src/App.tsx`
- Create: `web/src/lib/api.ts`, `web/src/lib/auth.ts`
- Create: `web/src/features/auth/LoginPage.tsx`, `web/src/features/projects/ProjectPage.tsx`, `web/src/features/issues/IssueBoard.tsx`, `web/src/features/assistant/AssistantPanel.tsx`
- Test: `web/src/lib/api.test.ts`, `web/src/App.test.tsx`

**Interfaces:**
- Consumes gateway endpoints and stores its access token in browser local storage for the local demo.
- Produces browser flows for login, project creation, issue creation/update, and assistant command submission.

- [ ] Write failing API-client tests that verify bearer-token injection and normalized failure handling; write a render test for the unauthenticated login state.
- [ ] Implement typed API client, auth state, responsive dashboard layout, project and issue forms, issue status board, and assistant conversation panel.
- [ ] Run `npm test` and `npm run build`; verify both pass.

### Task 8: Integrated startup and smoke verification

**Files:**
- Create: `scripts/run-demo.sh`, `scripts/smoke-test.sh`
- Modify: `README.md`, `docker-compose.yml`
- Test: `scripts/smoke-test.sh`

**Interfaces:**
- `scripts/run-demo.sh` starts backend applications and reports service URLs.
- `scripts/smoke-test.sh` exercises registration, login, project creation, issue creation, and assistant search through Gateway.

- [ ] Write the smoke script with explicit `curl --fail` checks and JSON assertions for each primary API response.
- [ ] Configure Docker Compose for optional PostgreSQL profiles and retain H2 as zero-dependency default.
- [ ] Run all Maven tests, frontend tests/build, startup script, and smoke script; resolve failures.
- [ ] Update README with exact commands, provider environment examples, security boundaries, and the faculty demo script.

## Self-review

Coverage: Tasks 1–5 implement all approved service, security, discovery, gateway, database, and REST requirements. Task 6 implements provider-configurable AI with the deterministic fallback. Task 7 supplies the requested runnable client. Task 8 verifies the complete demonstration flow. No placeholder tasks or undefined interfaces remain.
