# Endpoint-First Collaboration Dashboard Design

## Goal

Upgrade the collaboration platform with an original premium dark dashboard inspired by HorizonX's visual principles, while establishing every data contract and enforcing live HTTP verification before each UI feature is added.

## Architecture

The API Gateway is the only browser-facing entry point. It applies CORS, request IDs, rate limiting, and uniform error serialization. Auth, Project, and Issue remain independently owned domain modules. The AI boundary uses configured provider adapters but delegates all state changes to validated application tool functions. The Notification module consumes local domain events and exposes user-scoped notifications.

The dashboard is a pure API client. It must never bypass the gateway or decide authorization. It follows the endpoint contracts below and displays standardized errors.

## Endpoint Contracts

All protected endpoints require `Authorization: Bearer <JWT>`. Each response is JSON. Validation failures use `400`, absent credentials use `401`, insufficient roles use `403`, missing resources use `404`, and duplicate values use `409`.

| Area | Endpoint | Purpose |
|---|---|---|
| Auth | `POST /api/auth/register` | Create a user and return a session token. |
| Auth | `POST /api/auth/login` | Authenticate and return a session token. |
| Auth | `GET /api/auth/me` | Return the authenticated user's public profile. |
| Projects | `GET /api/projects` | List accessible projects. |
| Projects | `POST /api/projects` | Create a project; Manager/Admin only. |
| Projects | `GET/PATCH /api/projects/:id` | Read or update project metadata. |
| Projects | `POST /api/projects/:id/members` | Add a project member; owner/Admin only. |
| Projects | `GET /api/projects/:id/activity` | Read chronological project activity. |
| Issues | `GET/POST /api/issues` | List/filter or create issues. |
| Issues | `GET/PATCH /api/issues/:id` | Read or update allowed issue fields. |
| Issues | `POST /api/issues/:id/comments` | Add an issue comment. |
| Issues | `GET /api/issues/metrics` | Return dashboard-ready status/severity totals. |
| AI | `POST /api/ai/assistant` | Submit a command and execute only validated tool actions. |
| AI | `GET /api/ai/providers` | Return configured provider/fallback status without secrets. |
| AI | `GET /api/ai/actions` | List recent authorized AI actions. |
| Notifications | `GET /api/notifications` | List the current user's notifications. |
| Notifications | `PATCH /api/notifications/:id/read` | Mark a notification read. |
| Dashboard | `GET /api/dashboard/summary` | Aggregate visible KPI data for the dashboard. |

## Future Endpoint Integration Contract

New features extend the platform through a feature module, never by editing unrelated route logic. A module exports four pieces: a versioned route prefix under `/api`, request/response schemas, an authorization policy, and a dashboard API-client function. Gateway route registration is declarative, so a future `Sprint` module, for example, can add `/api/sprints` without altering Auth, Project, Issue, or existing client calls.

Every collection endpoint supports a consistent shape: `GET /api/<resource>` for filtered lists, `POST /api/<resource>` for creation, `GET/PATCH/DELETE /api/<resource>/:id` for an individual resource, where deletion is added only when its domain permits it. Query filters are explicit and validated. Responses use stable resource objects and errors use `{ error, code, requestId }`; incompatible changes receive a new `/api/v2` prefix rather than silently changing an existing payload.

The frontend keeps one API client organized by feature (`features/issues/api`, `features/projects/api`, and so on). Screens consume those feature functions rather than raw URLs. This permits new pages or cards to reuse an established module contract, keeps endpoint changes localized, and lets mock/test implementations exercise a feature without booting every service.

Each new endpoint must include: unit tests for the owning module, authorization/validation tests, one live Gateway HTTP request in the smoke suite, an OpenAPI-style entry in the README, and a dashboard integration test if it is user-facing.

## Delivery Order

1. Build Auth endpoints and test login, profile retrieval, invalid credentials, and role behavior over HTTP.
2. Build Project endpoints and test Manager project creation, Developer denial, member creation, and activity over HTTP.
3. Build Issue endpoints and test CRUD, filters, comments, workflow validation, and metrics over HTTP.
4. Build AI and Notification endpoints and test fallback/provider status, safe action output, notification reads, and authorization over HTTP.
5. Build the summary endpoint and verify its totals against known created data over HTTP.
6. Build the dashboard only after its dependent endpoints have passed both automated and live HTTP verification.

No feature advances to the next stage until its test suite passes and representative `GET`, `POST`, `PATCH`, or `DELETE` calls through Gateway return the expected code and JSON body. The README retains the exact commands and expected results.

## Dashboard Scope

The UI uses an original dark, editorial visual system: near-black background, cool-blue/violet glow, blurred translucent panels, oversized but restrained typography, grid-based KPI cards, and clear interactive feedback. It does not reproduce HorizonX brand, assets, code, or copy.

Screens/components:

- Sidebar navigation and project switcher
- Summary bento: open issues, critical issues, active projects, resolved rate
- Filterable Kanban board with quick status updates
- Project overview and chronological activity feed
- AI command centre with suggested actions, provider state, and structured results
- Notification drawer and unread count
- Responsive mobile layout

## Acceptance Criteria

Every listed endpoint is covered by automated tests and verified by a real local HTTP request. The dashboard makes no calls outside the Gateway and renders a helpful error state for failed API calls. A user can register, create a project, create/update/comment on an issue, see the metrics/activity/notification effects, and issue a safe AI command in one browser demonstration.
