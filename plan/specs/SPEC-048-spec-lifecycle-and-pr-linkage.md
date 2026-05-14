{% spec id="SPEC-048" status="draft" tags="plan, traceability, ai-workflow" %}

# Spec lifecycle and PR linkage

Close the loop between a spec, the work that implements it, and the PRs that ship it — so a reader can answer "is this built, and is it available to users?" without grepping prose.

## Problem

Today the chain *spec → work → implementation* exists in the data (work items carry `source="SPEC-xxx"`, validated by {% ref "SPEC-045" /%}'s reference checks) but the **completion half** of the chain is unstructured:

**Agents almost never link the PR back.** CLAUDE.md tells agents to include `PR: refrakt-md/refrakt#NNN` in the `--resolve` body, but only **2 of 177** work items in `plan/` actually contain a PR reference. The instruction lives inside a HEREDOC example, not as a standalone "MANDATORY" checklist bullet, and it's evidently being skimmed past.

**PR data isn't structured.** `Resolution` parses a `PR:` line out of the prose body, but it's not an attribute, so it can't be validated, can't be queried, and isn't rendered as a real link in the plan UI or MCP resources. There is no `plan status` rollup that says "SPEC-027 → WORK-093, WORK-094 → PRs #142, #156."

**Specs have no terminal state.** Spec statuses today are `draft | review | accepted | superseded | deprecated`. `accepted` answers "we agreed to do this," not "it's built" or "users can install it." For a project that publishes to npm via Changesets, the gap between *merged* and *available* is real — and specs (the closest thing to a user-facing "what was promised" surface) have nowhere to record it.

**`plan validate` is silent on missing PRs.** A work item can flip to `status="done"` with no `pr` attribute and no PR reference in the resolution, and the validator says nothing. The same is true of bugs.

-----

## Design Principles

**Structure what we want to query.** PR references are the natural pivot for traceability rollups ("which PRs implemented SPEC-X," "what shipped in v0.11.4"). Burying them in prose makes them invisible to tooling; promoting them to an attribute makes them first-class.

**Separate "built" from "shipped".** The two questions deserve two states. `implemented` reflects engineering reality (code in main); `shipped` reflects user reality (released to npm). Conflating them either lies to users or under-reports progress to maintainers.

**Manual transitions, machine-checkable invariants.** Don't auto-flip `shipped` from milestone state or git tags in v1 — the coupling is brittle and the manual flip aligns naturally with the existing `npm run release` step. But *do* let `plan validate` warn when invariants are broken (e.g. a `done` work item with no `pr`).

**The instruction has to be loud.** A line of guidance inside an example block has a 1% hit rate in practice. The completion checklist already uses imperative voice and "MANDATORY" framing — PR linkage belongs there.

-----

## Surface

### New attributes

| Rune | Attribute | Cardinality | Format | Required when |
|---|---|---|---|---|
| `work` | `pr` | multi-valued, comma-separated | `<org>/<repo>#<number>` | `status="done"` (warn) |
| `bug` | `pr` | multi-valued, comma-separated | `<org>/<repo>#<number>` | `status="fixed"` (warn) |
| `spec` | `released-in` | single-valued | semver (e.g. `v0.11.4`) | `status="shipped"` (error) |

### New spec statuses

| Status | Meaning | Transition trigger |
|---|---|---|
| `implemented` | All linked work items are `done`; code is in `main`. | Manual flip after the last work item lands. `plan status` may *suggest* the flip when all `implemented-by` work is done. |
| `shipped` | Released to users in an npm version. | Manual flip after `npm run release`, paired with `released-in="vX.Y.Z"`. |

Existing statuses (`draft | review | accepted | superseded | deprecated`) are unchanged. `accepted → implemented → shipped` is the new happy path; `accepted → superseded` and `accepted → deprecated` remain valid.

### CLI / MCP changes

| Surface | Change |
|---|---|
| `plan.update` / `refrakt plan update` | Accept `pr` and `released-in` as known attributes; existing `--resolve` flow unchanged |
| `plan.validate` / `refrakt plan validate` | Warn on `done` work / `fixed` bug with no `pr`; error on `shipped` spec with no `released-in`; error on malformed PR refs |
| `plan.status` / `refrakt plan status` | Roll up PRs per spec; suggest `implemented` flip when all linked work is done |
| Resolution parser (`plugins/plan/src/scanner-core.ts`) | Continue parsing `PR:` line for legacy items, but the attribute takes precedence |

### Documentation

CLAUDE.md "MANDATORY: Work Item Completion Checklist" gets a new top-level numbered step (between current steps 1 and 2):

> **Set the `pr` attribute on the work item** before marking it done:
> ```bash
> npx refrakt plan update <id> --pr "refrakt-md/refrakt#<number>"
> ```

The `--resolve` HEREDOC example keeps `Branch:` / `PR:` lines for narrative continuity, but the structured attribute is the source of truth.

-----

## Acceptance Criteria

- [ ] `work` and `bug` runes accept an optional, multi-valued `pr` attribute matching `<org>/<repo>#<number>`
- [ ] `spec` runes accept `implemented` and `shipped` status values
- [ ] `spec` runes accept an optional `released-in` attribute (semver format)
- [ ] `plan validate` errors on malformed `pr` values (anything not matching `<org>/<repo>#<number>`)
- [ ] `plan validate` errors on `status="shipped"` specs that lack `released-in`
- [ ] `plan validate` warns on `status="done"` work items and `status="fixed"` bugs that lack `pr`
- [ ] `plan status` includes a "PRs" rollup per spec, listing the unique PRs across its `implemented-by` work
- [ ] `plan status` suggests the `implemented` flip when every `implemented-by` work item of an `accepted` spec is `done`
- [ ] `plan.update` MCP tool exposes `pr` and `released-in` in its input schema with the same validation
- [ ] CLAUDE.md completion checklist gains a standalone, imperative bullet for setting the `pr` attribute, distinct from the `--resolve` example
- [ ] Documentation page under `site/content/docs/plan/` describes the new statuses, the `pr` attribute, and the happy-path lifecycle
- [ ] Existing work items that carry `PR:` in the resolution body are not broken; the parser continues to read that line for backward compat

-----

## Open Questions

**Should `plan validate` ever *error* on missing `pr`, or only warn?** Erroring blocks `--status done` for docs-only items resolved by direct commit (no PR). Warning is safer; a separate `--strict` mode could promote it. Recommend: warn only, in v1.

**Multi-PR work items vs. multi-work PRs.** A work item that took two PRs needs `pr="x,y"`. A PR that closes three work items means the same PR ref appears on three items — fine, but it means the "PRs per spec" rollup should dedupe. Recommend: multi-valued attribute, dedupe in rollups, no constraint on multiplicity.

**Auto-`implemented` flip.** Tempting to auto-transition a spec to `implemented` when its last work item flips to `done`. Couples spec lifecycle to work-graph completeness, which is sensitive to broken refs and missing source links. Recommend: suggestion in `plan status`, manual flip — not automatic.

**Agent session breadcrumb.** Out of scope for this spec, but related: an optional `Session:` line in the resolution body could record the agent run that produced the work item. Owner-only by virtue of Claude Code session URLs being private; useful as an audit bookmark even if not as shared provenance. Track separately.

**Migration of existing items.** 175 of 177 work items have no `pr` attribute. Don't backfill — the data isn't recoverable without manual lookup. Validate-warn surfaces the gap going forward; legacy items stay as-is unless someone wants to fill them in.

{% /spec %}
