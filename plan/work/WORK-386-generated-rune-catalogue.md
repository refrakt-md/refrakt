{% work id="WORK-386" status="ready" priority="medium" complexity="moderate" source="SPEC-092" milestone="v0.21.0" tags="registry,docs,showcase,runes" %}

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
- [ ] `rune-catalog` is generated via `collection`/`aggregate` over the `rune` entity type — always correct, no hand-maintained list.
- [ ] Index gains the "N runes across M plugins" stat(s).
- [ ] Renders correctly in light/dark; `vite build` green; the generated catalogue matches the actual rune set (cross-checked with the drift guardrail, {% ref "WORK-387" /%}).

## Dependencies
- {% ref "WORK-384" /%} (rune pages are `rune` entities) + {% ref "WORK-385" /%} (their category/plugin/status metadata).

## References
- {% ref "SPEC-092" /%} · {% ref "ADR-016" /%}

{% /work %}
