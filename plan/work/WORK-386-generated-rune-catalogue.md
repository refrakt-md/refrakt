{% work id="WORK-386" status="done" priority="medium" complexity="moderate" source="SPEC-092" milestone="v0.21.0" tags="registry,docs,showcase,runes" %}

# Generated rune catalogue + index stats

The SPEC-092 showcase: the docs site's own rune catalogue, **generated from the
registry** — the page about the runes built *from* the runes. The dogfood payoff
of frontmatter-declared entities, and open-world (a third-party plugin's documented
runes join with no change to refrakt).

## Scope
- Rebuild `runes/rune-catalog.md` as a `collection type="rune" group="category"`
  table (`fields="title,description"`), replacing the hand-maintained list.
- Add live index stats: `aggregate type="rune"` ("N runes") and
  `aggregate type="rune" group="plugin" layout="chart"` ("runes per plugin").

## Acceptance Criteria
- [x] `rune-catalog` is generated via `collection`/`aggregate` over the `rune` entity type — always correct, no hand-maintained list.
- [x] Index gains the "N runes across M plugins" stat(s).
- [x] Renders correctly in light/dark; `vite build` green; the generated catalogue matches the actual rune set (cross-checked with the drift guardrail, {% ref "WORK-387" /%}).

## Dependencies
- {% ref "WORK-384" /%} (rune pages are `rune` entities) + {% ref "WORK-385" /%} (their category/plugin/status metadata).

## References
- {% ref "SPEC-092" /%} · {% ref "ADR-016" /%}

## Resolution

Completed: 2026-06-11

Branch: `claude/work-385-rune-catalogue`.

### What was done
- Rebuilt `site/content/runes/rune-catalog.md` as a **generated** catalogue:
  - `{% aggregate type="rune" /%}` — inline "N documented runes" count.
  - `{% aggregate type="rune" group="plugin" layout="chart" chart-type="bar" /%}` — "runes per plugin" chart (the "across M plugins" stat).
  - `{% collection type="rune" group="category" sort="title" layout="table" %}` with heading-delimited columns (linked **Rune** title + **Description**) — replaces the entire hand-maintained core + per-package rune tables. Because each category maps to exactly one source (core's functional groups + one per plugin), grouping by category preserves the old structure while being fully live.
  - Kept the Official-packages nav-cards block (package overview/install links — navigation, not a rune list).
- xref fix (in `@refrakt-md/runes`): with rune pages now typed, an `{% xref %}` by a name shared by a page+rune of the same URL warned spuriously; the resolver now only warns when destinations diverge.

### Verification
- `vite build` green. Built `rune-catalog.html`: `data-count="94"`, `<th>Rune</th>`/`<th>Description</th>`, all 14 category groups, the per-plugin chart, and 108 rune links. The count (94) matches the actual `type: rune` page set, cross-checked by the WORK-387 guardrail. xref ambiguity warning gone (0).

### Notes
- Generated via frontmatter-declared `rune` entities (SPEC-092 Layer 2), so a third-party plugin shipping rune docs with the same frontmatter joins the catalogue with zero changes to refrakt (open-world payoff).

{% /work %}
