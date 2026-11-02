{% work id="WORK-673" status="done" priority="low" complexity="moderate" source="ADR-044" tags="plugins, vocabulary, css, tokens, lint, tooling, docs" milestone="v0.46.0" pr="refrakt-md/refrakt#754" %}

# A vocabulary report per plugin rune and a token-only lint for plugin CSS

{% ref "ADR-044" /%} lets a plugin rune bring its own structure CSS only for genuinely novel parts,
written only in theme tokens. Two checks make the tiers checkable rather than advice. Neither
exists.

## Acceptance Criteria

- [x] A report built from `refrakt contracts` lists, per plugin rune, the elements in its output that carry no vocabulary; it is a report, not an error, because tier 3 is legitimate
- [x] A lint flags literal colours, sizes and font stacks in a plugin's stylesheets; it starts as a report, and a plugin that passes can say it is theme-portable
- [x] Both run over the nine first-party plugins, and the results are recorded as the baseline Lumina's per-rune CSS drains from
- [x] The plugin-authoring guide (`site/content/extend/plugin-authoring/authoring.md`) is rewritten around ADR-044's three tiers, with its `styles/` example as a tier-3 example
- [x] The token set is documented as a public contract for plugins as well as themes

## References

- {% ref "ADR-044" /%}: Consequences.
- {% ref "WORK-672" /%}: the theme half of the coverage.

## Resolution

Completed: 2026-11-02

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `packages/transform/src/plugin-vocabulary.ts` (new):
  - `novelElements(contract, config)`: contract elements that are not a block zone, section role, media slot or ordinal;
  - `lintTokenOnly(css)`: literal colours, sizes and font stacks, ignoring tokens, keywords, `0`, token definitions and `var()` fallbacks.
  - Tests in `test/plugin-vocabulary.test.ts`.
- `packages/cli/src/commands/plugin-validate.ts`: a `vocabulary` report (novel elements per themed rune; literals per `styles/` sheet; `themePortable`), printed and in `--json`. Never an error.
- `scripts/plugin-vocabulary.mjs` with its test: the baseline for the nine first-party plugins, at `contracts/plugin-vocabulary.json` (68 runes, 44 novel elements; literals 21 colour, 687 size, 1 font across skeleton and Lumina per-rune CSS). Added `npm run plugins:vocabulary[:check]`, and excluded the file from Biome like the other generated baselines.
- Docs:
  - `extend/plugin-authoring/authoring.md` opens with ADR-044's three tiers, and its `styles/` example is now a tier-3, token-only sheet.
  - `theme-authoring/css.md` states the token set is a public contract for plugins.
  - The `cli-overview` row.

### Notes
- First-party plugins ship no CSS; their runes are styled by skeleton and Lumina per-rune files, so the baseline lints those.
- Some "novel" findings are runes whose `sections` lack an autoLabelled role (for example Changelog's eyebrow and blurb). Those are worth declaring, not styling.

{% /work %}
