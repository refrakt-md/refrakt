{% work id="WORK-491" status="done" priority="high" complexity="simple" milestone="v0.28.0" source="SPEC-117" tags="plan, mcp, status, drift, bug" %}

# Fix plan status/severity vocabulary drift in MCP and renderer config

The MCP server and renderer config hard-coded their own copies of the status/severity vocabulary and have drifted from the canonical `enums.ts` — a regression of the drift {% ref "SPEC-037" /%} / {% ref "WORK-127" /%} fixed once. This is the quick, standalone fix that ships value before the larger consolidation work.

## Acceptance Criteria
- [x] `mcp-bindings.ts` `STATUS_VALUES` accepts `pending` (currently omitted — MCP `plan.update` rejects the valid `pending` work status)
- [x] `mcp-bindings.ts` `SEVERITY_VALUES` uses `cosmetic`, not `trivial` (currently rejects the valid `cosmetic` and accepts `trivial`, which `plan validate` then flags)
- [x] `config.ts` bug `sentimentMap` keys `cosmetic` instead of `trivial`
- [x] `config.ts` work `sentimentMap` includes a `pending` entry
- [x] Tests cover `plan.update` accepting `pending` and `cosmetic` via the MCP path

## Approach
Point-fix the three files. This deliberately does not attempt the full single-source refactor (the follow-up consolidation work does that and makes these fixes structural rather than manual) — the aim here is to close the live bugs immediately.

## References
- {% ref "SPEC-117" /%} — spec (Drift-bug fixes)
- {% ref "SPEC-037" /%} / {% ref "WORK-127" /%} — the earlier fix this regressed

## Resolution

Completed: 2026-07-09

Branch: `claude/milestone-v0-28-0-llvtfa`
PR: refrakt-md/refrakt#565

### What was done
- Folded structurally into WORK-492's consolidation: MCP `STATUS_VALUES`/`SEVERITY_VALUES` now derive from `enums.ts`, so `plan.update` accepts `pending` and `cosmetic` and rejects `trivial`.
- `config.ts` bug `sentimentMap` keys `cosmetic`; work `sentimentMap` gains `pending` (plus `cancelled`/`superseded`).
- Added MCP drift-guard tests in `test/mcp-bindings.test.ts`.

{% /work %}
