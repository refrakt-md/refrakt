{% work id="WORK-717" status="in-progress" priority="medium" complexity="complex" source="SPEC-193" tags="docs, runes, examples, preview" milestone="v0.49.0" %}

# Rune page examples are live, minimal and real

SPEC-193 D5. Fifteen rune pages have no live preview (preview's own page among them), several
bury their point in inline sandbox and mockup code, and example content is placeholder or about the
engine.

## Acceptance Criteria
- [ ] Every rune that renders something has its examples as previews; a fence remains only for configuration, a CLI command or a file written elsewhere
- [ ] Variants that differ in one attribute are one preview with a sentence or table (backlog, character, realm, faction)
- [ ] No Lorem ipsum, placeholder sentences or engine copy; each plugin uses one consistent cast of example content; images come from one source
- [ ] sandbox's and mockup's bulky example code loads from files under `site/examples/` (`src=`)
- [ ] snippet's examples slice files that make the point

## Blocked by
- {% ref "WORK-712" /%}

## References
- {% ref "SPEC-193" /%}: D5, F6.

{% /work %}
