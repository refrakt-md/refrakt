{% spec id="SPEC-037" status="draft" version="1.0" tags="plan, cli, validation, quality" %}

# Plan Package Hardening

> Fix bugs, close validation gaps, and add missing capabilities in `@refrakt-md/plan` before building the Claude Code plugin layer (SPEC-036).

## Problem

An audit of the plan package revealed several categories of issues: schema/documentation mismatches, missing validation in the CLI, and a missing capability (attribute clearing) that the planned Claude Code skills will need. These are small individually but compound — a `/plan-done` skill built on a foundation with unreliable validation would inherit and amplify the problems.

-----

## Bugs

### 1. `pending` status missing from work schema

`plan/CLAUDE.md` documents `pending` as a valid work item status. 13 work items in the repo currently use it. But `work.ts` doesn't include `pending` in its status enum, meaning the schema rejects it as invalid even though the CLI and documentation treat it as legitimate.

**Fix:** Add `pending` to the work schema's status values.

### 2. Severity values mismatch

`bug.ts` defines severity as `['critical', 'major', 'minor', 'cosmetic']`. `validate.ts` checks against `['critical', 'major', 'minor', 'trivial']`. One says `cosmetic`, the other says `trivial`.

**Fix:** Pick one and align both files. `cosmetic` is the better term — `trivial` collides with the complexity scale.

### 3. Invalid complexity values in existing work items

Three work items use `complexity="high"` or `complexity="low"` instead of the valid values (`trivial`, `simple`, `moderate`, `complex`, `unknown`). These pass undetected because `validate` doesn't check complexity values.

**Fix:** Correct the three files. Add complexity validation to `validate.ts`.

### 4. Tag filtering is substring-based

`npx refrakt plan next --tag foo` matches items tagged `foo-bar` because the filter does a substring check on the comma-separated string rather than matching individual terms.

**Fix:** Split on comma, trim whitespace, match exactly.

-----

## Validation Gaps

### 5. `source` attribute references not validated

Work items reference specs and decisions via `source="SPEC-008"` or `source="SPEC-001,ADR-002"`. Neither `create`, `update`, nor `validate` checks that the referenced IDs actually exist. Broken references go undetected.

**Fix:** In `validate`, resolve each comma-separated ID in `source` against the entity index. Report broken references as errors.

### 6. `milestone` attribute not validated

Work items can reference a milestone that doesn't exist (`milestone="v99.0.0"`) without error.

**Fix:** In `validate`, check that `milestone` values match an existing milestone entity.

### 7. No acceptance criteria warning

20 work items have zero checkboxes. Some are in `ready` status — meaning `next` would pick them up for implementation even though there's nothing to check off. The `CLAUDE.md` says "Every work item must have [acceptance criteria]" but nothing enforces this.

**Fix:** In `validate`, warn when work items in `ready` or later status have no acceptance criteria. Info-level for `draft` items, warning for `ready`+.

### 8. Complexity validation missing

`validate` checks status, priority, and severity values but not complexity. Invalid values like `high` or `low` pass silently.

**Fix:** Add complexity to the validated fields in `validate.ts`.

-----

## Missing Capability

### 9. No way to clear an attribute

`update` can set or replace attribute values but cannot remove them. Once you set `--assignee claude` or `--milestone v1.0.0`, there's no way to unset it.

**Fix:** Support empty string as "clear": `--assignee ""` removes the attribute from the tag. Alternatively, a `--clear assignee` flag.

-----

## Out of Scope

The following were identified in the audit but are intentionally deferred:

- **Backward links from specs to work items** — navigability improvement, not a correctness issue. The `source` attribute on work items already creates the reverse mapping; display is a dashboard concern.
- **Formal dependency attributes** — the `{% ref %}` tag approach works for the `next` command. Adding `depends_on` would require migrating 126 files for marginal benefit.
- **Status workflow enforcement** (preventing draft→done jumps) — desirable but changes the CLI's behavior for existing users. Better addressed by the `/plan-done` skill which can check pre-conditions.
- **Timestamp auto-population** — the scanner reads `created`/`modified` from git, which is the right source of truth. The `create` command not setting them is acceptable.
- **Resolution backfill** for the 97 completed items missing summaries — historical debt, not a blocker. Would be a separate effort.

-----

## References

- {% ref "SPEC-036" /%} — Claude Code Skills and Hooks (the plugin that depends on a clean foundation)
- {% ref "SPEC-022" /%} — Plan CLI (the commands being fixed)

{% /spec %}
