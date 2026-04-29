---
title: Plan Entities
description: Reference for all plan entity types — specs, work items, bugs, decisions, and milestones
---

# Plan Entities

Each entity type has its own status progression, attributes, and conventional sections.

## Spec

Specifications are source-of-truth design documents. They describe *what* to build and *why*.

**Statuses:** `draft` → `review` → `accepted` → `superseded` | `deprecated`

| Attribute | Description |
|-----------|-------------|
| `id` | Required. e.g., `SPEC-023` |
| `status` | Current status (default: `draft`) |
| `version` | Spec version string, e.g., `"2.1"` |
| `supersedes` | ID of the spec this replaces |
| `tags` | Comma-separated labels |

```markdown
{% spec id="SPEC-001" status="draft" tags="auth, security" %}

# Authentication System

Users authenticate via email/password with JWT tokens.

## Requirements

- Email validation on registration
- Password minimum 12 characters
- Token refresh on expiry

{% /spec %}
```

Specs are freeform — use whatever section headings make sense for the design.

## Work

Work items are discrete, implementable tasks. They're the primary unit of progress tracking.

**Statuses:** `draft` → `ready` → `in-progress` → `review` → `done` (also: `blocked`, `pending`)

| Attribute | Description |
|-----------|-------------|
| `id` | Required. e.g., `WORK-051` |
| `status` | Current status (default: `draft`) |
| `priority` | `critical`, `high`, `medium`, `low` (default: `medium`) |
| `complexity` | `trivial`, `simple`, `moderate`, `complex`, `unknown` (default: `unknown`) |
| `assignee` | Person or agent working on it |
| `milestone` | Release target name |
| `source` | Comma-separated IDs of specs/decisions it implements |
| `tags` | Comma-separated labels |

**Conventional sections:**

| Section | Aliases | Purpose |
|---------|---------|---------|
| Acceptance Criteria | AC, Criteria, Done When | Checkable `- [ ]` items — required for tracking |
| Dependencies | Deps, Blocked By, Requires | Entity references that block this item |
| Approach | Technical Notes, Implementation Notes | How to implement |
| References | Refs, Related, Context | Links to related entities |
| Edge Cases | Exceptions, Corner Cases | Boundary conditions |
| Verification | Test Cases, Tests | How to verify the work |

```markdown
{% work id="WORK-001" status="ready" priority="high" source="SPEC-001" %}

# Implement login flow

Build the login form and connect it to the auth API.

## Acceptance Criteria

- [ ] Login form validates email format
- [ ] Error message shown on invalid credentials
- [ ] Successful login redirects to dashboard
- [ ] JWT token stored in httpOnly cookie

## Dependencies

- WORK-003 — Auth API endpoint must exist

## Approach

Use the existing form component library. JWT handling
via the auth middleware already in place.

{% /work %}
```

## Bug

Bug reports for defects.

**Statuses:** `reported` → `confirmed` → `in-progress` → `fixed` (also: `wontfix`, `duplicate`)

| Attribute | Description |
|-----------|-------------|
| `id` | Required. e.g., `BUG-001` |
| `status` | Current status (default: `reported`) |
| `severity` | `critical`, `major`, `minor`, `cosmetic` (default: `major`) |
| `assignee` | Person fixing it |
| `milestone` | Fix target |
| `source` | Related spec/decision IDs |
| `tags` | Comma-separated labels |

**Conventional sections:**

| Section | Aliases | Purpose |
|---------|---------|---------|
| Steps to Reproduce | Reproduction, Steps, Repro | How to trigger the bug |
| Expected | Expected Behaviour | What should happen |
| Actual | Actual Behaviour | What actually happens |
| Environment | Env | Platform/version info |

```markdown
{% bug id="BUG-001" status="confirmed" severity="major" %}

# Login crashes on empty password

## Steps to Reproduce

1. Open login page
2. Enter valid email
3. Leave password empty
4. Click "Sign in"

## Expected

Validation error shown below the password field.

## Actual

Unhandled exception — page crashes with a white screen.

{% /bug %}
```

## Decision

Architecture decision records (ADRs) capture design choices and their rationale.

**Statuses:** `proposed` → `accepted` → `superseded` | `deprecated`

| Attribute | Description |
|-----------|-------------|
| `id` | Required. e.g., `ADR-005` |
| `status` | Current status (default: `proposed`) |
| `date` | Date decided (ISO 8601) |
| `supersedes` | ID of the decision this replaces |
| `source` | Spec/entity IDs this decision informs |
| `tags` | Comma-separated labels |

**Conventional sections:**

| Section | Aliases | Required for `accepted` |
|---------|---------|------------------------|
| Context | Background | Yes |
| Options Considered | Options, Alternatives | No |
| Decision | — | Yes |
| Rationale | Reasoning | No |
| Consequences | Impact, Trade-offs | No |

```markdown
{% decision id="ADR-001" status="accepted" date="2026-03-15" source="SPEC-001" %}

# Use JWT for authentication

## Context

We need stateless authentication for the API. Sessions
require server-side storage which adds operational complexity.

## Options Considered

1. JWT tokens — stateless, widely supported
2. Session cookies — simple but requires session store
3. OAuth2 only — too complex for our initial use case

## Decision

Use JWT with short-lived access tokens (15 min) and
long-lived refresh tokens (7 days) stored in httpOnly cookies.

## Consequences

- No session store needed
- Token revocation requires a deny-list
- Refresh token rotation adds complexity but improves security

{% /decision %}
```

## Milestone

Named release targets that group work items and track progress toward a goal.

**Statuses:** `planning` → `active` → `complete`

| Attribute | Description |
|-----------|-------------|
| `name` | Required. Semver string, e.g., `v1.0.0` |
| `status` | Current status (default: `planning`) |
| `target` | Target date (ISO 8601, aspirational) |

```markdown
{% milestone name="v1.0.0" status="active" target="2026-06-01" %}

# v1.0.0 — Initial Release

- User authentication (login, registration, password reset)
- Core API endpoints
- Admin dashboard
- Documentation site

{% /milestone %}
```

Assign work items to milestones with the `milestone` attribute:

```shell
npx refrakt plan update WORK-001 --milestone v1.0.0
```

View milestone progress:

```shell
npx refrakt plan status --milestone v1.0.0
```
