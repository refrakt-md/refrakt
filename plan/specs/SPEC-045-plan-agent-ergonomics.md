{% spec id="SPEC-045" status="draft" tags="plan, mcp, ai-workflow" %}

# Plan agent ergonomics

Sharpen the plan tools for the workflow CLAUDE.md actually prescribes — pulling context before starting work, checking off many criteria when finishing, and trusting that referenced IDs are real.

## Problem

The plan MCP/CLI surface added by {% ref "SPEC-043" /%} is functionally complete (every plan operation has a tool) but the *workflow* it implies takes more round-trips than it should:

**Starting a work item costs 4-8 reads.** CLAUDE.md tells the agent: "Before implementing, read the work item's referenced specs in `plan/specs/` (follow ID references), related decision records in `plan/decisions/`, any dependency work items." Today that's a separate read per ID. There's no single call that says "give me everything I need to start WORK-094."

**Finishing a work item costs N+1 calls.** Each acceptance criterion is its own `plan.update --check "..."` call. A 13-criterion item is 13 round-trips, then one more to mark `--status done --resolve`. When the agent already has the data it needs, doing this in one call would halve the wall time.

**`plan.next` returns metadata but not the body.** The response includes id/title/criteria but not the prose (Approach, Context, Notes). The agent always has to follow up with a `refrakt://plan/work/<id>` read. For a tool whose explicit purpose is "find the next work item to do," returning enough context to start should be the default.

**`plan.validate` doesn't visibly check reference integrity.** A typo in `source="SPEC-031"` (when the referenced spec is actually SPEC-013) sits silently. The validator tracks ID uniqueness but doesn't fail when a `source` points at a non-existent ID.

**Status output is drowned by `no-milestone` warnings.** Legacy work items (WORK-005…WORK-018 in this repo) flood `plan.status` with 13+ no-milestone warnings every call. There's no way to bulk-assign milestones or to opt items out of the warning, so the warnings stay loud and the signal stays buried.

-----

## Design Principles

**Bundle reads, not writes.** The bundling tool is read-only and additive — it builds on existing resources rather than replacing them. Agents that prefer atomic resource fetches keep working; agents that want one call for the whole "ready to start" payload get it.

**Make `update` plural.** The simplest fix for criterion churn: accept arrays where today we accept strings. No new endpoint, no new mental model — `check: "criterion text"` and `check: ["one", "two", "three"]` both work.

**Validate what we promise.** CLAUDE.md tells agents to "follow ID references," which only works if those references are guaranteed valid. The validator should fail (or at minimum warn at error tier) on broken `source` and dependency references.

**Make warnings dismissable.** A warning that can't be silenced is a warning that gets ignored. Either bulk-fix legacy items, or add an explicit opt-out attribute (`no-milestone-ok="true"` or similar) so the warning means "needs attention" rather than "exists."

-----

## Tool Surface

| Tool | Inputs | Outputs |
|---|---|---|
| `plan.context` | `id: string`, `include?: ('source' \| 'decisions' \| 'deps' \| 'milestone')[]` | The entity, plus full bodies of its source spec, linked decisions, dependency work items, and (optionally) sibling items in the same milestone |
| `plan.update` | (existing) plus `check?: string \| string[]`, `uncheck?: string \| string[]` | Same shape; one `changes` entry per criterion mutated |
| `plan.next` | (existing) | Same shape plus `body: string` (Markdoc source of the prose body) |
| `plan.validate` | (existing) | Errors now include `BROKEN_REFERENCE` for `source` and dep IDs that don't resolve |
| `plan.bulk_update` (optional) | `ids: string[]`, `attrs: object`, `dryRun?: boolean` | Apply the same attribute change across many entities — primarily intended for retroactive `milestone` assignment on legacy items |

-----

## Acceptance Criteria

- [ ] `plan.context` MCP tool returning the entity plus bundled related items
- [ ] `plan.context` accepts an `include` filter so callers control payload size; default includes `source` and `deps`
- [ ] Each related item is returned with its full Markdoc body, not just metadata
- [ ] `plan.update` accepts `check` and `uncheck` as `string | string[]`; existing string callers unchanged
- [ ] Bulk check/uncheck mutations write the file once at the end and report which substrings matched and which didn't
- [ ] `plan.next` response includes the prose body of the returned item(s)
- [ ] `plan.validate` reports `BROKEN_REFERENCE` errors for `source` IDs and dependency IDs that don't resolve to an existing entity
- [ ] Reference integrity check runs by default (not behind `--strict`)
- [ ] Either: a `plan.bulk_update` tool for retroactive milestone assignment, OR a `no-milestone-ok` opt-out attribute that suppresses the warning per item — pick one
- [ ] CLI parity: `refrakt plan context <id>`, `refrakt plan update --check "a" --check "b"`
- [ ] Documented in `site/content/docs/plan/`, and CLAUDE.md updated to point agents at `plan.context` instead of the multi-read sequence

-----

## Open Questions

**Should `plan.context` recurse?** A spec might `source` another spec; following the chain could explode the payload. Suggest depth-1 only, with a `depth` knob if needed later.

**Atomicity of bulk checks.** What does "atomic" mean for a 50-criterion update? File-level atomicity (write once at the end) is achievable. Per-criterion rollback on a regex mismatch is not — surface the mismatches and apply the rest, or fail the whole call? Lean toward "apply what matched, report mismatches in the response."

**Body shape for `plan.next`.** Markdoc source string is small and round-trips cleanly; a parsed tree is structurally richer but heavier and ties the tool's output shape to Markdoc. Source string seems right.

{% /spec %}
