{% work id="WORK-513" status="ready" priority="high" complexity="moderate" source="SPEC-119" tags="plan, validation, lifecycle, dx" milestone="v0.30.0" %}

# Lifecycle-drift validation — spec-status checks and shared suggestImplemented predicate

Add the spec-side lifecycle-drift checks from {% ref "SPEC-119" /%} to `plan validate`, so a spec whose status contradicts the terminal evidence around its linked work is flagged rather than only nudged by `plan status`. This is the foundation work item for the drift-validation feature: it also establishes the shared predicate that both `plan status` (the `suggestImplemented` hint) and `plan validate` (the new `spec-status-lag` warning) resolve through, so the two surfaces can never diverge.

## Acceptance Criteria
- [ ] `plan validate` emits `spec-status-lag` (warning) for a non-terminal spec (`draft`/`review`/`accepted`) that has ≥1 linked work item and whose linked work is **entirely** achieving-terminal
- [ ] `plan validate` emits `spec-started-in-draft` (info) for a `draft` spec with ≥1 linked work item that has started (`in-progress` or achieving-terminal)
- [ ] `plan validate` emits `spec-status-ahead` (warning) for an `implemented`/`shipped` spec with ≥1 **non-terminal** linked work item
- [ ] `plan validate` emits `released-in-without-shipped` (warning) when `released-in` is set on a spec whose status is not `shipped`
- [ ] All predicates use the `isTerminal`/`isAchieving` helpers from {% ref "SPEC-117" /%}; no status set is re-declared in `validate.ts`
- [ ] No lifecycle warning fires for a spec with zero linked work items (absence of evidence is not a contradiction)
- [ ] `cancelled`/`superseded` work does **not** trigger `spec-status-lag` (drift-toward-done keys on achieving-terminal only)
- [ ] The `suggestImplemented` logic in `plan status` and `spec-status-lag` in `plan validate` share **one** predicate — no divergent second implementation
- [ ] `--strict` promotes the new warnings to errors, consistent with existing validate behaviour
- [ ] Each new issue `type` has a fixture-backed unit test (positive and negative case)

## Approach

The spec↔work linkage is the existing `source="SPEC-xxx"` edge. Reuse the `ACHIEVING_STATUSES`/`TERMINAL_STATUSES` sets and `isTerminal`/`isAchieving` helpers introduced by SPEC-117's `enums.ts` — do **not** hand-roll status sets in `validate.ts`. Factor the "all linked work is achieving-terminal, spec is non-terminal" test into a single predicate consumed by both `status.ts` (`suggestImplemented`) and `validate.ts` (`spec-status-lag`) so they cannot drift apart (the last criterion is the anchor for the whole feature).

Cap assertions at `implemented` — never infer `shipped`/`released-in` (that stays a human release step per SPEC-049). Validate reports drift; it never mutates status.

## References

- {% ref "SPEC-119" /%} — lifecycle-drift validation (this work item covers the spec-side v1 checks)
- {% ref "SPEC-117" /%} — `isTerminal`/`isAchieving` helpers reused here
- {% ref "SPEC-049" /%} — spec lifecycle states + the `suggestImplemented` hint being unified with validate

{% /work %}
