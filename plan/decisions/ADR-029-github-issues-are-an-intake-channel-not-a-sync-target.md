{% decision id="ADR-029" status="proposed" date="2026-09-08" source="SPEC-021" tags="plan,github,integration,workflow,tooling" %}

# GitHub Issues are an intake channel, not a sync target

## Context

The plan directory is this project's tracker. As of this ADR it holds 538 work
items, 120 specs, 28 decisions and 31 milestones, all in git, all authored and
read by agents through `refrakt plan`.

GitHub Issues on `refrakt-md/refrakt` holds **zero issues**. Not "few" — none
have ever been opened. Issues are enabled; the repo is public with 1 star and 0
forks. Every unit of work this project has ever tracked went into `plan/`.

So the question "should plan sync with GitHub Issues?" is not the question it
sounds like. There is no second system holding state that has drifted from the
first. There is one populated store and one empty one, and the real questions
underneath are three separate ones that a single word ("sync") hides:

1. Should plan content be **mirrored out** to Issues so it is visible where
   open-source contributors look?
2. Should Issues opened by **outsiders** get a path into `plan/`?
3. Is the **existing** GitHub linkage — the `pr` attribute — actually working?

They have different answers.

### What a bidirectional sync would have to reconcile

The two models are not near-misses; they disagree at the level of what an
entity *is*.

| Plan | GitHub Issues | Fidelity |
|---|---|---|
| 5 entity types (`spec`, `work`, `bug`, `decision`, `milestone`) | 1 type + labels (or org issue types) | Lossy — type becomes a convention again, which is what {% ref "SPEC-021" /%} set out to escape |
| 9 work statuses, with `TERMINAL_STATUSES` ≠ `ACHIEVING_STATUSES` | `open` / `closed` + `state_reason` (`completed`, `not_planned`, `duplicate`) | **Lossy in the direction that matters.** `cancelled` and `superseded` both collapse to `not_planned`; nothing round-trips the distinction back |
| `## Blocked by` / `## Blocks` — a directed graph with cycle detection | Sub-issues — a *tree*, plus prose | Not representable. Blocked-by has no native GitHub encoding outside Projects fields |
| Stable authored IDs (`WORK-538`) | Server-assigned numbers | Requires a durable ID↔number mapping table as a third store |
| Markdoc bodies containing `{% ref %}`, tables, nested runes | GFM | `{% ref "WORK-340" /%}` renders as literal noise in an issue body |
| Acceptance criteria as parsed `Criterion[]` | Task-list checkboxes | Round-trips syntactically; checked-state authority is contested |
| Milestones: semver name + scope + goals prose | Title + due date | Partial |
| History derived from git commits ({% ref "SPEC-038" /%}) | Issue timeline events | Two audit trails that will disagree |

Beyond the field-level losses there is an authority problem. Bidirectional sync
needs a conflict policy, and neither side can supply one: git gives the files
merge semantics and review; the Issues API gives last-write-wins. The failure
mode is not a merge conflict, it is silence — an edit made in the GitHub UI gets
overwritten by the next `plan update`, or vice versa, and nobody is told. That
is bad for any tracker and specifically corrosive here, because `plan/` is what
agents read as ground truth. A tracker that quietly lies to its readers is worse
than no second surface at all.

### Mirroring out is answering a question the plan site already answers

The stated payoff for outbound mirroring is visibility. But the browsable
interface is the entire Phase 2 pitch of {% ref "SPEC-021" /%}, and it exists:
plan directories are ordinary refrakt sites, rendered and published. Pushing 538
items into Issues would produce a worse view of the same data (no typed refs, no
spec coverage, no dependency edges), permanently, plus 538 notification events
and a mapping table to maintain.

{% ref "SPEC-021" /%} also positions plan runes explicitly *against*
GitHub-Issues-backed tooling (CCPM), and its design principles open with "Specs
are the primary artefact. Not user stories, not tickets." Mirroring every work
item into a ticket tracker adopts the shape the spec rejected.

### The linkage that already exists is broken in practice

`work` and `bug` already carry `pr` (`<org>/<repo>#<n>`, validated by
`PR_REF_RE`), and `plan status` rolls it up. `CLAUDE.md` makes setting it
mandatory on completion.

Measured on the current tree:

| | Count |
|---|---|
| Work items with `status="done"` | 486 |
| …of those, carrying a `pr` attribute | **38 (7.8%)** |
| Items with a legacy `PR:` line in `## Resolution` | 12 |

The spec→work→PR chain is broken on 92% of completed work. Nothing enforces it,
nothing derives it, and it is a manual step at exactly the moment the agent
believes it is finished. This is a real, already-scoped GitHub integration gap
that involves no Issues API at all — and it is worth more than any mirror,
because it is the link the project already decided it wanted.

## Options Considered

1. **Bidirectional sync (`plan sync github`)** — reconcile `plan/` and Issues
   both ways, with a mapping table and a conflict policy. Pros: one workflow for
   contributors who live in Issues. Cons: every row of the fidelity table above
   becomes a permanent lossy translation; needs a third store; silent-clobber
   failure mode; large ongoing surface for a repo whose Issues count is zero.
2. **Outbound mirror (one-way, plan → Issues)** — publish work items as issues,
   close them when items go terminal. Pros: visibility without a conflict
   policy. Cons: duplicates the plan site with a strictly worse view; 538-item
   backfill; still needs the ID mapping; contradicts {% ref "SPEC-021" /%}'s
   positioning.
3. **Inbound intake only (one-way, Issue → plan, once)** — a command that drafts
   a `bug`/`work` from a named issue, records provenance, and stops. No ongoing
   reconciliation, no mapping table beyond one attribute. Pros: gives outsiders
   a zero-friction front door (they will not open a PR against `plan/`); cheap;
   no conflict policy needed because nothing is ever written twice. Cons: the
   issue and the plan item drift after intake — accepted, because the issue is
   then just a citation.
4. **Close the `pr` loop** — derive/enforce the existing `pr` attribute instead
   of adding a new integration. Pros: fixes a measured 92% gap; no new concepts.
   Cons: not what "GitHub integration" sounds like; does nothing for Issues.
5. **Do nothing.** Pros: free. Cons: leaves both the intake gap (once the
   project has users) and the `pr` gap (already real) open.

## Decision

**Reject 1 and 2. Adopt 4 now, and 3 when the project has outside reporters.**

- No bidirectional sync, and no outbound mirror, in the plan package or this
  repo. Issues are not a replica of `plan/`.
- Treat GitHub Issues as an **intake channel**: a place strangers file things,
  from which a plan entity may be drafted once, by an agent or a command, with
  provenance recorded. Intake is a translation, not a binding.
- Prioritise closing the `pr` loop, which is the GitHub linkage the project
  already committed to and is not honouring.

Concretely, in priority order:

1. **Enforce `pr` on completion.** `plan validate` warns when a work/bug item is
   achieving-terminal (`DONE_STATUS_SET`) and carries neither a `pr` attribute
   nor a resolution `PR:` line. Backfill the 486 existing items from git history
   where the merge commit is recoverable.
2. **Derive `pr` rather than typing it.** The branch name is already in
   `Resolution.branch` and `plan history` already shells out to git; the merge
   commit's `(#123)` subject gives the number. A `--pr auto` (or a resolve-time
   default) removes the manual step that is being skipped.
3. **Add `github` to `ALLOWED_ATTRS` for `work` and `bug`** — a comma-separated
   list of `<org>/<repo>#<n>` issue references, distinct from `pr` (which means
   "this PR implemented it"). `github` means "this originated from / is
   discussed at". One attribute is the whole intake mapping.
4. **Intake, when there is something to take in.** `refrakt plan from-issue
   <ref>` (or just an agent following a documented recipe) drafts a `bug`/`work`
   with `github` set, title and body carried over, and optionally comments the
   plan ID back onto the issue. Deferred until the repo actually receives
   issues — consistent with {% ref "SPEC-039" /%}'s reasoning that agents plus
   the existing CLI are already a sufficient import API, and that rigid
   importers built ahead of demand end up too generic or too opinionated.

## Rationale

The asymmetry decides it. Sync is the right tool when two populated stores have
diverged and both have authority. Here one store has everything and the other
has nothing, and the plan store is the one with the richer model, the validation,
the history, and the readers. Translating it down to issue-shaped state buys
nothing it does not already have and costs it fidelity it was built to provide.

Choosing intake over sync also keeps the direction of loss correct. Translating
*into* the richer model is a normal authoring act — the agent reads prose and
writes a schema-valid entity, exactly what {% ref "SPEC-039" /%} argued agents
are already good at. Translating *out of* it is where the fidelity table bites,
and one-way intake never does that.

The `pr` finding reorders the work on its own merits: a 7.8% compliance rate on
a mandatory step is not a discipline problem, it is a missing derivation. Fixing
it makes the spec→work→PR chain real for 486 items, which is more traceability
than any Issues mirror would have produced, at a fraction of the surface.

## Consequences

- `plan/` remains the single writable tracker. No mapping table, no reconciler,
  no conflict policy, no sync daemon in the plan package.
- Issues stay enabled and become a documented front door; `CONTRIBUTING` (when
  written) should say that issues are read and triaged into `plan/`, and that
  the plan site is where status lives. Reporters must not expect their issue to
  track state — it will be cited, not mirrored.
- `plan validate` gains a `pr-missing` warning, which will fire on ~448 existing
  items until backfilled. Backfill should land with, or before, the rule.
- Adding `github` widens `ALLOWED_ATTRS` for two types, which touches
  `enums.ts`, the `work`/`bug` schemas, the MCP input schemas and the renderer —
  the SPEC-117 single-source-of-truth path, so the cost is bounded and the
  exhaustiveness test covers drift.
- This ADR is reversible per-repo but should not be reversed casually: if plan
  ever needs true bidirectional sync, that is a new spec with a conflict policy
  as its first section, not an extension of intake.
- The decision is scoped to the shipped `@refrakt-md/plan` package as well as
  this repo. Downstream projects that *do* live in Issues are the population
  that would want option 1 — evidence that such users exist, and what they need,
  is the trigger to revisit.

{% /decision %}
