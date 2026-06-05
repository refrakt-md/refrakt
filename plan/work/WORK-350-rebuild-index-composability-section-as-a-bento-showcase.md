{% work id="WORK-350" status="draft" priority="medium" complexity="moderate" source="SPEC-085" milestone="v0.19.0" tags="site,bento,composability,demo,capstone" %}

# Rebuild index composability section as a bento showcase

Capstone + real-world validation. Replace the current split-`feature`
composability section on the site index (a `juxtapose` of two `sandbox`es) with a
richer **bento grid** where each cell is a different live rune composition — the
section *demonstrates composability by being a composition*. It doubles as the
hero example atop the new Compositions docs category ({% ref "WORK-346" /%}) and
as the dogfood proof that the bento substrate works end to end.

## Proposed cells (tune during build)
- **Anchor (large):** the existing `juxtapose` of two `sandbox`es (light/dark profile card) — the only live iframes.
- **Plan chart:** `{% aggregate type="work,bug,spec,decision,milestone" group="status" layout="chart" %}` — our **own roadmap**, live ({% ref "WORK-349" /%}).
- **Map:** a 2-pin `map` in a cell.
- **Stat (small, tinted):** an `aggregate` count ("100+ runes").
- **Showcase bleed (wide):** a `mockup` (static screenshot) in a `showcase`, bleeding past the tile corner.
- **Code/diagram (small):** a compact `codegroup` or `diagram`.
- **Pullquote (small, tinted dark):** the existing testimonial quote.

## Acceptance Criteria
- [ ] The index composability section is a `bento` grid authored with explicit `{% bento-cell %}` cells (exercises WORK-347), with mixed sizes and a coherent magazine rhythm.
- [ ] One tile charts the real plan roadmap via `aggregate layout="chart"` ({% ref "WORK-349" /%}).
- [ ] At least one tile uses showcase bleed and at least two use per-cell tint (the SPEC-085 signature compositions).
- [ ] Live `sandbox` iframes are limited (anchor cell only; the showcase tile uses a static image) to keep the landing page fast.
- [ ] The section renders correctly in light and dark mode and at mobile widths; no layout/overflow regressions.
- [ ] The grid is referenced as the hero example from the Compositions category ({% ref "WORK-346" /%}).

## Approach
Author as site content in `site/content/index.md`, replacing the current
`{% feature %}` composability block. Depends on the full bento substrate and the
aggregate chart layout landing first. Treat it as the acceptance test for the
whole composition/bento workstream.

## Dependencies
- Bento substrate: {% ref "WORK-345" /%}, {% ref "WORK-347" /%}, {% ref "WORK-348" /%}
- Media-zone selector: {% ref "WORK-339" /%}
- Plan chart: {% ref "WORK-349" /%}

## References
- `site/content/index.md` (current `feature`/`juxtapose` composability section)
- {% ref "SPEC-085" /%}, {% ref "WORK-346" /%}

{% /work %}
