{% work id="WORK-535" status="done" priority="high" complexity="simple" source="SPEC-125" tags="cli,reference,dx" milestone="v0.32.0" pr="refrakt-md/refrakt#594" %}

# Report a rune's actual universal attributes in refrakt reference

`refrakt reference card` prints:

> **Universal attributes (available on every rune):** tint, tint-mode, bg, width,
> **reading, dropcap**, spacing, inset, elevation, **prominence**, reveal,
> stagger, frame, …

On a card, `reading`, `dropcap` and `prominence` do nothing. The CLI states as a
fact something false about the rune it is describing — the symptom that opened
{% ref "SPEC-125" /%}.

Unlike language-server completion, this does **not** fall out of
{% ref "WORK-534" /%} for free: the line is a separate code path printing
`UNIVERSAL_ATTRIBUTE_NAMES` wholesale rather than reading the rune's schema.

## Acceptance Criteria

- [x] The blanket "available on every rune" claim is gone
- [x] The universal attributes reported for a rune are the ones its schema
      actually carries, read from the schema rather than from a static list
- [x] `--format json` reports the same narrowed set, so machine consumers agree
      with the human output
- [x] `refrakt reference list` and `refrakt reference dump` are consistent with
      the single-rune output
- [x] No theme config is loaded to produce it
- [x] A test pins the correction against a rune with known-inapplicable
      attributes, so the false claim cannot return
- [x] `AGENTS.md` (or whatever `dump --check` guards) is regenerated if its
      content shifts
- [x] `npm run build` and the full repo suite pass

## Approach

Worth deciding rather than defaulting: does an inapplicable attribute vanish
from the output entirely, or appear marked as unavailable?

Vanishing is simplest and matches the schema. But the structure contract already
records *why* an axis is unavailable on a rune ("this rune declares no body
section"), and surfacing that is more useful to someone wondering why `reading`
is missing from `card` when it is on `textblock`. Reference output is a teaching
surface, so the reason is probably worth showing — but it should be a choice, not
an accident of implementation.

## Blocked by
- {% ref "WORK-534" /%}

## References

- {% ref "SPEC-125" /%} — Phase 3
- {% ref "WORK-527" /%} — the contract entries carrying the reasons

## Resolution

Completed: 2026-09-09

Branch: `claude/milestone-v0-31-0-e5ihxr`
PR: refrakt-md/refrakt#594

### What was done

`refrakt reference <rune>` now reports the universal attributes that rune
actually carries, and names the reason for each axis it does not.

- **`packages/runes/src/schema-universals.ts`** (new) — `describeSchemaUniversals(schema)`,
  the schema-only view. **The schema is the ground truth; the rule only
  explains it**: `available` is read off the schema's own attribute list rather
  than recomputed, and an axis is reported unavailable only if the schema really
  carries none of its attributes. So the reasons can never contradict the
  attribute list printed beside them — which matters, because "the tool states
  as fact something false about the rune it is describing" is the bug being
  fixed, and a drifting explanation would be a fresh instance of it.
- **`packages/runes/src/lib/index.ts`** — `RuneStructure` gains
  `universalAttributes`, recorded by `createContentModelSchema` (always, even
  for the `auto` default, so "structurally gated" is distinguishable from
  "nothing known"). New `declareUniversalPosture(schema, posture)` for
  hand-written schemas.
- **`packages/runes/src/tags/{badge,xref,icon,tint,bg,expand}.ts`** — each
  declares its posture, one line plus the reason. This is what lets the report
  explain `badge` as *inline* rather than reaching for a structural reason that
  is true and beside the point.
- **`packages/runes/src/reference.ts`** — the markdown line, the JSON shape
  (`attributes.universalUnavailable`), and the hoisted dump section. The dump
  section now reads as the shared vocabulary rather than a blanket promise.
- **Docs** — `site/content/docs/cli/reference.md` gains a worked example of the
  new output; `site/content/runes/surfaces.md` now points at `refrakt reference`
  (WORK-534 had to point away from it, since it was the thing that lied).
- **Changeset** — `.changeset/olive-moons-shout.md`.

### Tests

`packages/runes/test/reference-universals.test.ts` (7) — the blanket claim is
gone; the reported set is the schema's; each absence is explained; an inline
rune is explained by posture rather than anatomy; a rune that *does* carry a
gated axis still reports it (over-narrowing the report would be its own false
claim); JSON and markdown agree; and, across every core rune, an axis the schema
carries is never reported unavailable.

`packages/runes/test/reference.test.ts` — the existing tier test pinned the false
line verbatim, all 37 names. Rewritten to assert the fixture's actual three.

Direction-checked: reintroducing the old line fails 3 of the 7 new cases.

### Notes

- **Explain rather than vanish.** The item posed this as a choice. Vanishing
  matches the schema and is simpler, but reference output is a teaching surface —
  it is what `create-refrakt` writes into `AGENTS.md` for coding agents — and
  "why is `reading` on `textblock` but not on `grid`?" is what a bare omission
  leaves unanswered.
- **51 of the 55 runes** in this repo's reference had at least one false claim.
- **No theme config is loaded.** `ReferenceContext` carries schemas, fixtures and
  source names — no config, which is the right shape under ADR-028. That is why
  the posture had to become reachable from the schema rather than being read from
  `RuneConfig.universalAttributes`.
- **Nothing to regenerate.** No `AGENTS.md` is checked in anywhere in this repo
  (the only `reference dump` header in the tree is prose inside SPEC-041), so no
  `dump --check` guard exists to update.
- The item's opening example is stale in one detail: it cites `reading` and
  `dropcap` as inert on `card`. WORK-532 gave card a `body` role in v0.31.0, so
  today only `prominence` is genuinely unavailable there — which is what the
  corrected output reports.

{% /work %}
