{% work id="WORK-596" status="ready" priority="high" complexity="moderate" source="SPEC-136" tags="mcp, staleness, agents, ai-workflow, drift" milestone="v0.37.0" %}

# The refrakt_stale MCP tool and the touching query

**This is the phase where the feature stops being retrospective.** It is placed
after {% ref "WORK-595" /%} only because an impact lookup that knows about
`snippet` invocations but not about the guides is a lookup that misses the pages
most worth updating.

The CLI answers *"what is stalest across the corpus?"* — a survey, run
occasionally. An agent editing code has a different and better-timed question:
**"I am about to change these files. What documents them?"**

| Argument | Query | Caller |
|---|---|---|
| *(none)* | The ranked report, as the CLI | Periodic review |
| `touching: [paths]` | Every page whose edges point at those paths | **An agent mid-edit** |
| `since: <ref>` | The same, for everything changed since a git ref | A PR-scoped sweep |

## `touching` is a different query, not a filtered report

It is an edge-index lookup, **not a staleness measurement** — there is no commit
count involved, because the change has not happened yet.

Three consequences that are easy to get wrong by implementing it as a filter
over the ranked report:

- It runs **without the git scan at all**, so it works in a shallow clone and
  answers for a file created in the working tree and never committed.
- It is **unbounded by `--top`**, because a budget designed to keep a survey
  readable would silently drop pages an agent needs.
- It returns **structured rows**, never formatted text ({% ref "SPEC-135" /%}
  D6): referring page, line, the edge's target, and whether a
  {% ref "SPEC-134" /%} `reviewed` marker is attached.

This is why {% ref "WORK-594" /%} builds the index as a standalone module.

## The loop this exists for

```
agent edits packages/runes/src/config.ts
  → refrakt_stale { touching: ["packages/runes/src/config.ts"] }
  → extend/rune-authoring/authoring-overview.md:106 documents this file
  → agent opens that page and updates it in the same change
```

The divergence is caught **before it exists**. That is the difference between
this feature and every other drift check in the repository, all of which report
rot that has already happened.

## Acceptance Criteria

- [ ] A `refrakt_stale` MCP tool with no arguments returns the ranked report as structured findings, not formatted text
- [ ] `refrakt_stale { touching: [paths] }` returns every page whose edges point at those paths, with referring page, line, target, and whether a `reviewed` marker is attached
- [ ] `touching` runs without the git scan and returns results for a path with no commit history — including a file created in the working tree and never committed
- [ ] `touching` returns every match, unbounded by `--top`
- [ ] `refrakt_stale { since: <ref> }` resolves the changed paths from that ref and answers as `touching` would
- [ ] The ranking, `touching` and `since` queries all read the same shared index, with no query owning it
- [ ] An invocation carrying a matching {% ref "SPEC-134" /%} `reviewed` marker scores zero regardless of commit count
- [ ] CLAUDE.md documents the `touching` call as a step in the per-task workflow

## Approach

Follow `plugins/plan/src/mcp-bindings.ts` for the binding shape — it is the
established pattern for this server and it already returns structured findings.

The `reviewed`-scores-zero rule (D3) belongs on the ranking side and is the one
place this track touches {% ref "SPEC-134" /%}: a marker is a stronger statement
than a commit count, so where one exists it wins. Where no marker exists the
count stands.

## Blocked by

- {% ref "WORK-595" /%} — an impact lookup without the guides misses the pages most worth updating
- {% ref "WORK-591" /%} — the `reviewed` marker the zero-score rule and the `touching` rows read

## Notes

**Check whether the CLAUDE.md line actually works** rather than assuming it.
D12 leans on it and the spec is honest that this is an assumption, not a result.
The per-task workflow already prescribes several structured steps and they are
followed, which is weak evidence in favour.

If agents do not call `touching` unprompted, the remedy is a hook or a `plan
update` side effect — **not a more emphatic sentence**. Record which it turned
out to be.

`--precise` (region scoping via `git log -L`) is {% ref "SPEC-136" /%} phase 4
and is **not in this milestone**. It sharpens a signal the earlier phases have
to prove is worth sharpening, and it needs {% ref "SPEC-131" /%}'s resolver to
make a region resolvable on both ends.

## References

- {% ref "SPEC-136" /%} — the MCP surface, D3 (`reviewed` scores zero), D12 (the index as a shared module, and why this phase is the payoff)
- {% ref "SPEC-135" /%} — D6, an MCP tool returns findings rather than a rendered report
- {% ref "SPEC-043" /%} — the MCP server this joins
- {% ref "WORK-594" /%} — the index all three queries read
- `plugins/plan/src/mcp-bindings.ts` — the binding pattern to follow

{% /work %}
