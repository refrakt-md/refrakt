{% work id="WORK-596" status="done" priority="high" complexity="moderate" source="SPEC-136" tags="mcp, staleness, agents, ai-workflow, drift" milestone="v0.37.0" pr="refrakt-md/refrakt#650" %}

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

- [x] A `refrakt_stale` MCP tool with no arguments returns the ranked report as structured findings, not formatted text
- [x] `refrakt_stale { touching: [paths] }` returns every page whose edges point at those paths, with referring page, line, target, and whether a `reviewed` marker is attached
- [x] `touching` runs without the git scan and returns results for a path with no commit history — including a file created in the working tree and never committed
- [x] `touching` returns every match, unbounded by `--top`
- [x] `refrakt_stale { since: <ref> }` resolves the changed paths from that ref and answers as `touching` would
- [x] The ranking, `touching` and `since` queries all read the same shared index, with no query owning it
- [x] CLAUDE.md documents the `touching` call as a step in the per-task workflow
- [x] Marker awareness is additive and gated on {% ref "WORK-591" /%}: where the `reviewed` attribute exists, an invocation carrying a matching marker scores zero regardless of commit count, and `touching` rows report whether one is attached
- [x] With {% ref "WORK-591" /%} not yet landed, every other criterion above still passes and the marker column is absent rather than blocking

## Approach

Follow `plugins/plan/src/mcp-bindings.ts` for the binding shape — it is the
established pattern for this server and it already returns structured findings.

The `reviewed`-scores-zero rule (D3) belongs on the ranking side and is the one
place this track touches {% ref "SPEC-134" /%}: a marker is a stronger statement
than a commit count, so where one exists it wins. Where no marker exists the
count stands.

## Blocked by

- {% ref "WORK-595" /%} — an impact lookup without the guides misses the pages most worth updating

{% ref "WORK-591" /%} is a **soft** dependency and deliberately not listed
above. The marker-aware criteria need it; nothing else here does, and hard-
blocking on it would put this item behind the entire
{% ref "SPEC-131" /%} chain ({% ref "WORK-597" /%} → {% ref "WORK-587" /%} →
{% ref "WORK-589" /%} → {% ref "WORK-591" /%}) — the longest path in the
milestone, and the wrong thing to put in front of the one item that makes the
feature preventive rather than retrospective. Build the marker column behind a
capability check and land it whenever {% ref "WORK-591" /%} does.

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

## Resolution

Completed: 2026-09-25

Branch: `claude/v0-37-0-review-vqpl41`

### What was done

- `packages/mcp/src/tools/core.ts` — the `refrakt.stale` tool. No arguments
  returns the ranked survey as structured rows; `touching: [paths]` returns
  every page whose edges point at them; `since: <ref>` resolves the changed
  paths and answers as `touching` would. All three read one shared index built
  by `buildEdgeIndex` — no query owns it.
- `packages/content/src/edges/git-scan.ts` — `changedSince(repoRoot, ref)` for
  the `since` query, kept beside `execSync` rather than reaching for `require()`
  from an ESM module.
- `CLAUDE.md` — workflow step 3b: call `refrakt.stale { touching: [...] }`
  before changing a source file. The step that prevents drift rather than
  reporting it.
- `packages/content/src/edges/exclude.ts` (new) — `resolveStaleSettings()`
  reads content roots from the sites the project declares and the optional
  `stale` section; `globToRegExp`/`globMatcher` implement a deliberately small
  glob subset (`*`, `**`, `?`, trailing `/`). No brace expansion, no negation.
- `packages/types/src/config.ts` — `StaleConfig` with `archival` (referrer
  globs) and `generated` (target globs), both defaulting to empty; added to
  `refrakt.config.schema.json`, the schema drift guard, and the generated
  configuration reference.
- `packages/runes/src/lib/invocation.ts` (new) — `sliceForInvocation`, moved
  out of the CLI's `snippet-review.ts` so the marker tool and the ranking
  resolve an anchor identically.
- `rankEdges` now suppresses an edge only for a marker that is **still
  current**; `buildEdgeIndex` sets `markerStale` by comparing against the live
  slice. `touching` rows report `reviewedStale`.

### Notes

**The marker rule was wrong in a way WORK-591 made real.** Skipping any edge
carrying `reviewed=` was indistinguishable from the correct rule while no
markers existed. Once they do, a marker the target has outgrown would silence
the edge permanently — strictly worse than no marker. Fixed with a test that
would have failed under the old rule.

**Exclusions had to be project configuration, not hard-coded directories**
(ADR-035). Every project using refrakt has a different folder structure, so
compiling in `docs/migration/` or `blog/` builds the tool for one repository.
Two named lists rather than one `exclude`, and the exclusion counts print in
the footer, so the lists cannot quietly grow until the report is empty.

Also removed the compiled-in `site/content`: roots come from the config's
sites, and the command refuses rather than guessing when there is no config.

**Whether agents call `touching` unprompted is still unmeasured.** The item
asks for that to be checked rather than assumed; it cannot be answered inside
the change that introduces the instruction. If it turns out they do not, the
remedy is a hook or a `plan update` side effect, not a more emphatic sentence.

{% /work %}
