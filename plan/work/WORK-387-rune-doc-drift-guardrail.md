{% work id="WORK-387" status="ready" priority="low" complexity="simple" source="SPEC-092" milestone="v0.21.0" tags="registry,tooling,ci,runes" %}

# Rune-doc drift guardrail

Frontmatter-driven catalogues can drift from code — add a `defineRune` without a
doc page and it silently vanishes from the generated catalogue. Turn that into a
build signal. Fast-follow to the catalogue work.

## Acceptance Criteria
- [ ] A check (a `refrakt inspect` mode and/or a test) asserts every core `defineRune` and every plugin `Plugin.runes` entry has a corresponding `/runes/<name>` doc page, and flags doc pages with no backing rune.
- [ ] Runnable in CI; a missing page is a clear failure naming the rune.

## Dependencies
- {% ref "WORK-385" /%} (establishes the `/runes/<name>` doc-page convention to check against).

## References
- {% ref "SPEC-092" /%} (drift guardrail) · `refrakt inspect --list` / `refrakt reference` (the existing programmatic catalogue)

{% /work %}
