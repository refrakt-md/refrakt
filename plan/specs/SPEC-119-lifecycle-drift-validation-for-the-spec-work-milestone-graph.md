{% spec id="SPEC-119" status="draft" source="SPEC-049" tags="plan, validation, lifecycle, traceability, dx" %}

# Lifecycle-drift validation for the spec–work–milestone graph

Teach `plan validate` to flag entities whose **status lags behind (or runs ahead of) the terminal evidence around them** — a spec still `draft` after all its work shipped, a work item still `blocked` after its blockers finished, a milestone still `active` after everything in it is done. Today these contradictions are invisible to tooling and only surface through periodic manual audits.

## Problem

{% ref "SPEC-049" /%} gave specs the terminal states `implemented` and `shipped` and gave `plan status` a `suggestImplemented` hint. But that hint lives only in the **reporting** tool — a surface you run when you choose to. Nothing **fails a check** when reality and status diverge, so drift accumulates silently:

- A manual audit of `plan/` found **38 `draft` specs whose linked work was 100% `done`** — shipped features still labelled "not yet agreed to build" — plus **32 `accepted` specs** that were never advanced to `implemented`/`shipped`. None of this was caught by `plan validate`; it took a hand-rolled cross-reference of work statuses to find.
- The drift is bidirectional and not spec-only. Work items keep a stale `blocked` status after their `## Blocked by` targets finish (silently excluding them from `plan next`), and milestones sit `active` long after every assigned item is `done`.

`plan validate` already polices lifecycle consistency in **one direction** — `shipped-without-release`, `superseded-without-target`, `resolution-not-done`, `done-without-resolution` all assert *"your status claims X, so the evidence X requires must be present."* This spec adds the **symmetric** check: *"the terminal evidence has outrun (or contradicts) the status."*

-----

## Design Principles

**Validate flags contradictions; `status` suggests opportunities.** This is the dividing line that keeps `validate` low-noise. A spec that *could* advance is an opportunity — it stays a `plan status` nudge. A spec whose status is *demonstrably at odds* with terminal evidence is a contradiction — that becomes a `validate` warning. Validate fires on lies, not on to-dos.

**A deliberate, scoped revision of SPEC-049's stance.** SPEC-049 chose "manual transitions over coupled automation" and "carrot before stick" for its v1, on purpose. This spec does **not** overturn that — it does not auto-flip statuses, and it does not add a "must have `pr`" nag. It only makes the *contradiction subset* visible in the CI-gating tool now that the vocabulary has bedded in. Suggestions stay carrots; contradictions become warnings.

**Key on achieving-terminal, not all-terminal.** A spec whose linked work is entirely `cancelled`/`superseded` must **not** be nudged toward `implemented` — it should probably be retired itself. Drift-toward-done checks key on `ACHIEVING_STATUSES` (`done`/`fixed`); drift-toward-retired checks key on the non-achieving terminals. Reuse the `isTerminal`/`isAchieving` helpers introduced by {% ref "SPEC-117" /%}; do not hand-roll status sets.

**Cap assertions at `implemented`; never infer `shipped`.** Deriving `released-in` reliably needs changelog + release heuristics a validator cannot prove. Validate may assert "this should be *at least* `implemented`"; choosing `shipped` and its version stays a human step (as SPEC-049 intended).

**No warning without linked evidence.** Every drift check requires ≥1 linked entity (work item, dependency, or milestone member). Specs with no linked work produce no lifecycle warning — absence of evidence is not a contradiction.

-----

## Scope — the drift checks

Linkage is the existing `source="SPEC-xxx"` edge for spec↔work, the {% ref "SPEC-114" /%} directed `## Blocked by` edges for work↔work, and the `milestone` attribute for milestone membership. `achieving` = `done`/`fixed`; `terminal` = achieving ∪ `cancelled`/`superseded`/`wontfix`/`duplicate`; `retired` = the non-achieving terminals.

### Spec status vs. work evidence

| Type | Predicate | Severity | Priority |
|---|---|---|---|
| `spec-status-lag` | Spec is `draft`/`review`/`accepted`, has ≥1 linked work item, and **all** linked work is achieving-terminal | warning | v1 |
| `spec-started-in-draft` | Spec is `draft` and ≥1 linked work item has *started* (`in-progress`/achieving-terminal) | info | v1 |
| `spec-status-ahead` | Spec is `implemented`/`shipped` but ≥1 linked work item is **non-terminal** | warning | v1 |
| `retired-spec-live-work` | Spec is `superseded`/`deprecated` but ≥1 linked work item is non-terminal | warning | v2 |
| `terminal-spec-no-work` | Spec is `implemented`/`shipped` with **zero** linked work items | info | v2 |

### Attribute / status consistency

| Type | Predicate | Severity | Priority |
|---|---|---|---|
| `released-in-without-shipped` | `released-in` is set but status ≠ `shipped` (mirror of the existing `shipped-without-release`) | warning | v1 |

### Work status vs. dependency evidence

| Type | Predicate | Severity | Priority |
|---|---|---|---|
| `stale-blocked` | Work `status=blocked` but **all** `## Blocked by` targets are achieving-terminal | warning | v1 |
| `false-ready` | Work is `ready`/`in-progress` but ≥1 `## Blocked by` target is non-terminal | info | v2 |

### Milestone completion drift

| Type | Predicate | Severity | Priority |
|---|---|---|---|
| `milestone-complete-with-open-work` | Milestone `status=complete` but ≥1 assigned item is non-terminal | warning | v1 |
| `milestone-done-not-complete` | Milestone `active`/`planning`, ≥1 assigned item, and **all** assigned items are achieving-terminal | info | v2 |

The v1 set is chosen for high signal and low false-positive rate; the v2 set is more opinionated (a retired spec may keep open work on purpose; a milestone may stay `active` for non-work reasons) and can follow once the v1 warnings are proven non-noisy.

-----

## Acceptance Criteria

- [ ] `plan validate` emits `spec-status-lag` (warning) for a non-terminal spec whose linked work is entirely achieving-terminal.
- [ ] `plan validate` emits `spec-started-in-draft` (info) for a `draft` spec with started work.
- [ ] `plan validate` emits `spec-status-ahead` (warning) for an `implemented`/`shipped` spec with a non-terminal linked work item.
- [ ] `plan validate` emits `released-in-without-shipped` (warning) when `released-in` is set on a non-`shipped` spec.
- [ ] `plan validate` emits `stale-blocked` (warning) for a `blocked` work item whose `## Blocked by` targets are all achieving-terminal.
- [ ] `plan validate` emits `milestone-complete-with-open-work` (warning) for a `complete` milestone with a non-terminal member.
- [ ] All drift predicates use the `isTerminal`/`isAchieving` helpers from SPEC-117; no status-set is re-declared in `validate.ts`.
- [ ] No lifecycle warning fires for an entity with zero linked evidence.
- [ ] `cancelled`/`superseded` work does **not** trigger any drift-toward-done check.
- [ ] Each new issue `type` has a fixture-backed unit test (positive and negative case).
- [ ] `--strict` promotes the new warnings to errors, consistent with existing behaviour.
- [ ] The `suggestImplemented` logic in `plan status` and `spec-status-lag` in `plan validate` share one predicate (no divergent second implementation).

## Out of scope

- **Auto-flipping statuses.** Validate reports drift; it never mutates. (Preserves SPEC-049's manual-transition principle.)
- **Inferring `shipped` / `released-in`.** Left to the human release step.
- **`pr`-absence nagging.** SPEC-049 deliberately declined this; unchanged here.
- A dedicated `plan doctor --fix` autofixer — a plausible follow-up, but a separate spec.

## Open questions

- Should the v1 warnings ship **off by default** (opt-in via `--lifecycle` or config) for one release to gauge real-world noise before they gate CI, or straight to on? Recommendation: on, but land alongside a one-time migration pass so the repo starts clean.
- `spec-started-in-draft` vs. legitimate exploratory work: is `draft` + started work always wrong, or a valid "spike first, formalise later" pattern? If common, demote to opt-in.

{% /spec %}
