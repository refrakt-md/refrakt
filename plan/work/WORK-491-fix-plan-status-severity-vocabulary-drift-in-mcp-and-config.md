{% work id="WORK-491" status="ready" priority="high" complexity="simple" milestone="v0.28.0" source="SPEC-117" tags="plan, mcp, status, drift, bug" %}

# Fix plan status/severity vocabulary drift in MCP and renderer config

The MCP server and renderer config hard-coded their own copies of the status/severity vocabulary and have drifted from the canonical `enums.ts` — a regression of the drift {% ref "SPEC-037" /%} / {% ref "WORK-127" /%} fixed once. This is the quick, standalone fix that ships value before the larger consolidation work.

## Acceptance Criteria
- [ ] `mcp-bindings.ts` `STATUS_VALUES` accepts `pending` (currently omitted — MCP `plan.update` rejects the valid `pending` work status)
- [ ] `mcp-bindings.ts` `SEVERITY_VALUES` uses `cosmetic`, not `trivial` (currently rejects the valid `cosmetic` and accepts `trivial`, which `plan validate` then flags)
- [ ] `config.ts` bug `sentimentMap` keys `cosmetic` instead of `trivial`
- [ ] `config.ts` work `sentimentMap` includes a `pending` entry
- [ ] Tests cover `plan.update` accepting `pending` and `cosmetic` via the MCP path

## Approach
Point-fix the three files. This deliberately does not attempt the full single-source refactor (the follow-up consolidation work does that and makes these fixes structural rather than manual) — the aim here is to close the live bugs immediately.

## References
- {% ref "SPEC-117" /%} — spec (Drift-bug fixes)
- {% ref "SPEC-037" /%} / {% ref "WORK-127" /%} — the earlier fix this regressed

{% /work %}
