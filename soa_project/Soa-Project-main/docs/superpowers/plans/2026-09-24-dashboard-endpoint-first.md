# Endpoint-First Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the runnable collaboration platform with complete, future-extensible HTTP APIs before building an original premium dashboard.

**Architecture:** Preserve the local dependency-free runtime while splitting each public resource into an endpoint module, a domain module, and a feature API client. A route registry composes modules under `/api`; endpoint contracts use stable version-one payloads and gateway smoke tests exercise every completed feature.

**Tech Stack:** Node.js 22, native `node:test`, native `http`, browser JavaScript/CSS.

**Spec:** `docs/superpowers/specs/2026-09-24-dashboard-endpoint-first-design.md`

## Global Constraints

- Every new endpoint is reached through `http://localhost:8080`.
- Protected requests must accept only bearer tokens and return JSON errors with `error`, `code`, and `requestId`.
- A feature is complete only after tests and live Gateway HTTP checks pass.
- UI code calls only feature API-client functions, never hard-coded endpoint URLs.
- New resources use versioned `/api` route prefixes and independently registered modules.

## Review Focus

- Invalid/missing bearer tokens return `401` JSON rather than throwing.
- A developer is blocked from manager-only project mutations.
- Invalid issue status leaves the original issue unchanged.
- Summary totals match the issues visible to the caller.
- Unknown future route prefixes return a structured `404`.

### Task 1: API foundation and endpoint registry

**Files:**
- Create: `src/api/{router,response,request}.mjs`, `src/features/auth/routes.mjs`
- Modify: `server.mjs`, `src/platform.mjs`
- Test: `tests/api-foundation.test.mjs`

- [ ] Write failing tests for structured unknown-route, malformed request, and `GET /api/auth/me` behavior.
- [ ] Run `node --test tests/api-foundation.test.mjs` and observe RED.
- [ ] Implement request IDs, JSON response helpers, route registration, bearer extraction, and the authenticated profile endpoint.
- [ ] Run the test file and full `npm test`; observe GREEN.
- [ ] Start the server and verify `GET /api/auth/me` with a valid token returns `200`, and without one returns `401`.

### Task 2: Project detail, membership, and activity endpoints

**Files:**
- Create: `src/features/projects/{routes,service}.mjs`
- Modify: `src/platform.mjs`, `server.mjs`
- Test: `tests/projects-api.test.mjs`

- [ ] Write failing tests for GET/PATCH project, member addition, activity listing, and Developer `403`.
- [ ] Run the tests and observe RED.
- [ ] Implement project endpoint module, activity events, role/ownership enforcement, and consistent errors.
- [ ] Run the tests and full suite; observe GREEN.
- [ ] Verify representative Gateway `POST`, `GET`, and `PATCH` requests with `curl` and record them in README.

### Task 3: Issue detail, comments, metrics, and DELETE convention

**Files:**
- Create: `src/features/issues/{routes,service}.mjs`
- Modify: `src/platform.mjs`, `server.mjs`
- Test: `tests/issues-api.test.mjs`

- [ ] Write failing tests for issue detail, PATCH validation, comment creation, status/severity metrics, and mutation denial.
- [ ] Run the tests and observe RED.
- [ ] Implement endpoint module and service methods with status validation before any mutation, comments, activity emission, and metrics.
- [ ] Run tests/full suite; observe GREEN.
- [ ] Verify `GET`, `POST`, and `PATCH` requests through Gateway and validate metric totals.

### Task 4: AI providers, action audit, and notifications

**Files:**
- Create: `src/features/ai/{routes,service,providers}.mjs`, `src/features/notifications/routes.mjs`
- Modify: `src/platform.mjs`, `server.mjs`
- Test: `tests/ai-notifications-api.test.mjs`

- [ ] Write failing tests for provider status, safe AI search/create action audit, user notifications, and mark-read behavior.
- [ ] Run tests and observe RED.
- [ ] Implement provider metadata without exposing secrets, AI action audit, notification event creation, and notification endpoint module.
- [ ] Run tests/full suite; observe GREEN.
- [ ] Verify AI, provider, notification GET/POST/PATCH calls through Gateway.

### Task 5: Dashboard summary endpoint and smoke suite

**Files:**
- Create: `src/features/dashboard/routes.mjs`, `scripts/smoke-test.mjs`
- Modify: `server.mjs`, `README.md`
- Test: `tests/dashboard-api.test.mjs`

- [ ] Write failing summary-total and user-visibility tests.
- [ ] Run tests and observe RED.
- [ ] Implement summary endpoint and smoke script covering all public endpoint groups.
- [ ] Run tests/full suite/smoke suite; observe GREEN.
- [ ] Document all endpoint request examples and expected response codes.

### Task 6: Feature API client and HorizonX-inspired dashboard

**Files:**
- Create: `web/app.js`, `web/styles.css`, `web/features/{auth,projects,issues,ai,notifications,dashboard}.js`
- Modify: `web/index.html`
- Test: `tests/dashboard-render.test.mjs`

- [ ] Write failing API-client and rendering tests for KPI cards, Kanban columns, assistant result, and notification count.
- [ ] Run tests and observe RED.
- [ ] Implement feature-separated API clients and original dark dashboard layout: sidebar, bento metrics, Kanban, activity, AI command centre, and notification drawer.
- [ ] Run tests/full suite; observe GREEN.
- [ ] Manually verify the browser demo against the live Gateway, including responsive layout and failed-request state.

## Self-review

The first five tasks build and prove API contracts before Task 6 uses them. Every route group has unit tests, a live HTTP verification, and a dedicated module. The summary dashboard only consumes the established endpoint/client layer. No endpoint payload relies on UI internals, making future route modules additive.
