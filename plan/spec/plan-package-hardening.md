{% spec id="SPEC-037" status="accepted" version="1.0" tags="plan, cli, validation, content-model, quality" %}

# Plan Package Hardening

> Fix bugs, close validation gaps, implement `knownSections` for plan runes, and add missing CLI capabilities — all before building the Claude Code plugin layer (SPEC-036).

## Problem

An audit of the plan package revealed three categories of issues:

**Schema and documentation drift.** The work rune schema doesn't include `pending` status even though 13 work items use it. Severity enums disagree between `bug.ts` and `validate.ts`. Three work items have invalid complexity values that pass undetected.

**Validation blind spots.** The `source` attribute references specs and decisions that may not exist — never checked. Same for `milestone`. Work items can reach `ready` status with zero acceptance criteria. Complexity values aren't validated at all.

**Prose-embedded structure.** Dependencies, acceptance criteria, approach notes, and references are documented as free-form prose under H2 headings. The content is there, but the system can't distinguish a "Dependencies" section from any other H2. It can't validate that required sections exist, can't extract structured data from them, and can't accept aliases like "AC" for "Acceptance Criteria".

The first two categories are bug fixes. The third is the `knownSections` feature — already designed in SPEC-003 and SPEC-021 but never implemented. It's the right foundation for structured section validation, and it eliminates the need for attribute-heavy workarounds like `depends_on="WORK-076,WORK-080"`.

-----

## Design Principles

**Sections over attributes for rich content.** Dependencies have context ("needs the config interface from WORK-076"). Acceptance criteria are checkboxes with prose descriptions. These are naturally sections — paragraphs, lists, references — not comma-separated attribute values. `knownSections` formalises what authors are already writing.

**No migration required.** Existing work items already have `## Acceptance Criteria`, `## Approach`, `## References` headings. `knownSections` recognises these retroactively. Files don't need to change — the system becomes smarter about what's already there.

**Aliases accept variation.** Authors write "AC", "Criteria", "Done When", "Acceptance Criteria" — all valid. `knownSections` maps them to a canonical name. Same for "Deps", "Depends On", "Dependencies" and "Repro", "Steps", "Steps to Reproduce".

-----

## Attributes vs Sections

`knownSections` does not replace existing tag attributes. The two layers serve different purposes:

**Attributes** are scalar values for querying. `status`, `priority`, `source`, `milestone`, `assignee`, `tags` — these are what the CLI filters, sorts, and groups on. `npx refrakt plan next --tag runes --milestone v1.0.0` works because those values are on the tag, compact and machine-readable.

**Known sections** are rich content for reading and validation. A Dependencies section contains prose context ("needs the config interface from WORK-076"), mixed references, and items that may not even have IDs yet ("the Lumina CSS tokens need to be finalized first"). An Acceptance Criteria section contains checkboxes with detailed descriptions. These can't be flattened into attribute values without losing their purpose.

The relationship between `source` and a Dependencies section is a good example. `source="SPEC-008,ADR-002"` tells the CLI which spec this work item implements — a compact link for querying and dashboard display. The Dependencies section tells a reader what must be in place before implementation can start, and why. Different questions, different answers, both useful.

All existing attributes (`id`, `status`, `priority`, `complexity`, `assignee`, `milestone`, `source`, `tags`, `severity`, `version`, `supersedes`, `date`) remain unchanged.

-----

## Part 1: Bug Fixes

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

## Part 2: Validation Gaps

### 5. `source` attribute references not validated

Work items reference specs and decisions via `source="SPEC-008"` or `source="SPEC-001,ADR-002"`. Neither `create`, `update`, nor `validate` checks that the referenced IDs actually exist. Broken references go undetected.

**Fix:** In `validate`, resolve each comma-separated ID in `source` against the entity index. Report broken references as errors.

### 6. `milestone` attribute not validated

Work items can reference a milestone that doesn't exist (`milestone="v99.0.0"`) without error.

**Fix:** In `validate`, check that `milestone` values match an existing milestone entity.

### 7. Complexity validation missing

`validate` checks status, priority, and severity values but not complexity. Invalid values like `high` or `low` pass silently.

**Fix:** Add complexity to the validated fields in `validate.ts`.

-----

## Part 3: `knownSections` for Plan Runes

SPEC-003 (Declarative Content Model) designs the `knownSections` extension to the sections content model. SPEC-021 (Plan Runes) shows the exact section definitions for work, bug, and decision runes. WORK-024 tracks the implementation but is currently blocked on framework support. This spec unblocks it.

### Framework support

The `SectionsModel` interface in `packages/types/src/content-model.ts` needs a `knownSections` field. The resolver in `packages/runes/src/lib/resolver.ts` needs to match section headings against known names and aliases (case-insensitive), falling back to the default `sectionModel` for unrecognised headings. The pseudocode already exists in SPEC-003 (lines 1116-1118):

```typescript
const sectionModel = model.knownSections?.[headingText]
  || findAlias(model.knownSections, headingText)
  || model.sectionModel;
```

### Work rune sections

| Section | Aliases | Required | Content |
|---------|---------|----------|---------|
| Acceptance Criteria | Criteria, AC, Done When | Yes (for `ready`+) | Checkbox list |
| Dependencies | Deps, Depends On, Blocked By, Requires | No | List with `{% ref %}` tags and context prose |
| Approach | Technical Notes, Implementation Notes, How | No | Freeform prose |
| References | Refs, Related, Context | No | List of `{% ref %}` tags |
| Edge Cases | Exceptions, Corner Cases | No | Freeform prose |
| Verification | Test Cases, Tests | No | Freeform prose |

**Dependencies as a known section** replaces the "formal dependency attribute" that was considered and rejected. The section approach is better because:

- Dependencies often have context: "Needs the config interface from WORK-076" — not just an ID
- Existing files already use `## Dependencies` or `## References` with prose descriptions
- The scanner can extract `{% ref %}` tags from the Dependencies section to build the dependency graph, giving the `next` command structured data without requiring a rigid attribute
- No migration: files with `## Dependencies` or `## Depends On` are recognised automatically

### Bug rune sections

| Section | Aliases | Required | Content |
|---------|---------|----------|---------|
| Steps to Reproduce | Reproduction, Steps, Repro | Yes (for `confirmed`+) | Ordered list |
| Expected | Expected Behaviour | Yes (for `confirmed`+) | Prose |
| Actual | Actual Behaviour | Yes (for `confirmed`+) | Prose |
| Environment | Env | No | List |

### Decision rune sections

| Section | Aliases | Required | Content |
|---------|---------|----------|---------|
| Context | Background, Why | Yes | Prose |
| Options Considered | Options, Alternatives | No | Prose |
| Decision | | Yes | Prose |
| Rationale | Reasoning, Why | No | Prose |
| Consequences | Impact, Trade-offs | No | Prose |

### Scanner integration

The scanner currently extracts acceptance criteria by finding checkbox list items anywhere in the file, and extracts `{% ref %}` tags from the entire file without knowing which section they belong to. With `knownSections`, it becomes section-aware:

- **Section-scoped ref extraction.** Refs are tagged with the canonical section they came from. A `{% ref "WORK-076" /%}` in the Dependencies section is structurally distinct from one in the References section.
- **Known section presence.** Report which known sections are present/missing per entity, using the canonical name regardless of which alias the author used.
- **Canonical indexing.** Use the canonical section name (not the alias) for all indexing and data access.

### Dependency resolution via `next`

Today, the `next` command treats every `{% ref %}` tag in a file as a potential blocker — if the referenced entity isn't done, the item is excluded. This is imprecise: a `{% ref "SPEC-008" /%}` in the References section (informational context) blocks the item just as much as one in a Dependencies section (actual prerequisite).

With section-scoped refs, the `next` command gains precision:

| Section containing the ref | Meaning | Effect on `next` |
|---|---|---|
| Dependencies | Prerequisite — must be completed first | Blocks the item until the referenced entity is done |
| References | Related context — informational | No blocking effect |
| Approach, Edge Cases, etc. | Mentioned for context | No blocking effect |

Only refs in the Dependencies section (or its aliases: Deps, Depends On, Blocked By, Requires) are treated as blockers. All other refs are informational.

**Authoring convention:** Use `{% ref %}` tags in the Dependencies section for machine-readable blocking relationships:

```markdown
## Dependencies
- {% ref "WORK-076" /%} — needs the config interface it introduces
- {% ref "SPEC-008" /%} must reach `accepted` before this can start
- The Lumina CSS tokens need to be finalized first (no work item yet)
```

The first two bullets are machine-readable blockers — the `next` command checks their status. The third is human context — visible to the reader, invisible to the CLI. That's the right behavior: if there's no ref tag, there's nothing to check the status of.

This is strictly more accurate than the current approach. No existing behavior is lost — files that put all their refs in undifferentiated sections continue to work via the fallback (all refs treated as potential blockers, same as today). Files that adopt the Dependencies known section get the improved precision.

### Validation integration

Once `knownSections` are declared, `validate` gains new checks:

- **Missing required sections**: warn when a work item in `ready`+ status has no Acceptance Criteria section
- **Missing required sections**: warn when a confirmed+ bug has no Steps to Reproduce, Expected, or Actual section
- **Missing required sections**: warn when an accepted decision has no Context or Decision section

These replace the standalone "acceptance criteria warning" (item 7 from the original spec) with a general-purpose mechanism.

-----

## Part 4: Missing CLI Capability

### 8. No way to clear an attribute

`update` can set or replace attribute values but cannot remove them. Once you set `--assignee claude` or `--milestone v1.0.0`, there's no way to unset it.

**Fix:** Support empty string as "clear": `--assignee ""` removes the attribute from the tag. Alternatively, a `--clear assignee` flag.

-----

## Implementation Order

1. **Part 1: Bug fixes** — small, no dependencies, immediately shippable
2. **Part 2: Validation gaps** — small, depends only on existing scanner data
3. **Part 3: `knownSections`** — the main work, unblocks WORK-024. Framework support first, then plan rune declarations, then scanner/validation integration
4. **Part 4: Attribute clearing** — independent, can ship alongside any part

Parts 1-2 and 4 are prerequisite for SPEC-036 (Claude Code plugin). Part 3 makes the plugin significantly better (structured dependency data, section validation) but is not a hard blocker — the plugin can launch with basic validation and gain knownSections support later.

-----

## Out of Scope

- **Backward links from specs to work items** — navigability improvement, not a correctness issue. The `source` attribute on work items already creates the reverse mapping; display is a dashboard concern.
- **Status workflow enforcement** (preventing draft→done jumps) — desirable but better addressed by the `/plan-done` skill which can check pre-conditions without restricting the CLI.
- **Timestamp auto-population** — the scanner reads `created`/`modified` from git, which is the right source of truth. The `create` command not setting them is acceptable.
- **Resolution backfill** for the 97 completed items missing summaries — historical debt, not a blocker.

-----

## References

- {% ref "SPEC-003" /%} — Declarative Content Model (framework-level `knownSections` design)
- {% ref "SPEC-021" /%} — Plan Runes (section definitions for work/bug/decision)
- {% ref "SPEC-036" /%} — Claude Code Skills and Hooks (the plugin that depends on a clean foundation)
- {% ref "SPEC-022" /%} — Plan CLI (the commands being fixed)
- {% ref "WORK-024" /%} — Add `knownSections` to Plan Rune Content Models (blocked, unblocked by this spec)

{% /spec %}
