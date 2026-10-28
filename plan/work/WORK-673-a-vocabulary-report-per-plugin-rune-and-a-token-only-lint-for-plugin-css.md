{% work id="WORK-673" status="ready" priority="low" complexity="moderate" source="ADR-044" tags="plugins, vocabulary, css, tokens, lint, tooling, docs" milestone="v0.46.0" %}

# A vocabulary report per plugin rune and a token-only lint for plugin CSS

{% ref "ADR-044" /%} lets a plugin rune bring its own structure CSS only for genuinely novel parts,
written only in theme tokens. Two checks make the tiers checkable rather than advice. Neither
exists.

## Acceptance Criteria

- [ ] A report built from `refrakt contracts` lists, per plugin rune, the elements in its output that carry no vocabulary; it is a report, not an error, because tier 3 is legitimate
- [ ] A lint flags literal colours, sizes and font stacks in a plugin's stylesheets; it starts as a report, and a plugin that passes can say it is theme-portable
- [ ] Both run over the nine first-party plugins, and the results are recorded as the baseline Lumina's per-rune CSS drains from
- [ ] The plugin-authoring guide (`site/content/extend/plugin-authoring/authoring.md`) is rewritten around ADR-044's three tiers, with its `styles/` example as a tier-3 example
- [ ] The token set is documented as a public contract for plugins as well as themes

## References

- {% ref "ADR-044" /%}: Consequences.
- {% ref "WORK-672" /%}: the theme half of the coverage.

{% /work %}
