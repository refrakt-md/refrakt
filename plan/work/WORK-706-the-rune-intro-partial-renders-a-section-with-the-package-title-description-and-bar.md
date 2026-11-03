{% work id="WORK-706" status="done" priority="medium" complexity="moderate" source="SPEC-187" tags="docs, runes, reference, include, section, bar, file-ref, drawer" milestone="v0.48.0" pr="refrakt-md/refrakt#770" %}

# The rune-intro partial renders a section with the package, title, description and bar

SPEC-187 D2, D3, D8 and D9: `site/content/_partials/rune-intro.md`, included as
`{% include file="rune-intro.md" variables={r: "rune:<name>"} /%}`, renders a `section` whose
eyebrow is the package, headline the title, blurb the description, and whose body is a `bar`. The
spec's sketches show the intended result for a composition, a native plugin rune, a core rune, a
non-stable rune and a staged rune.

## Acceptance Criteria
- [x] The partial renders the eyebrow (package linked to its plugin page, or `Core`), an `<h1>` title and the description as the blurb
- [x] The bar's left group shows, in order and each only when it applies: a `Composition` badge with a puzzle icon, a status badge when the status is not `stable`, and the `schemaType` badge linked to its schema.org page; a native rune shows no kind badge
- [x] The bar's right group shows an Install action for a plugin rune and a Source action for every rune, so a core rune shows Source alone
- [x] The Install action opens a drawer with `npm install <package>`, the `plugins` entry for `refrakt.config.json` and a link to the plugin's overview page, built by the partial from `package`
- [x] The Source action opens a `file-ref` drawer on the record's `source`
- [x] A test asserts that the `<h1>` inside the include still sets the page title, TOC and heading index
- [x] A test asserts that `file-ref` reads a `path` substituted from a `$row` value
- [x] On a docs page the section reads as a page header, light and dark, at 1280px and 390px; any adjustment is made with the section's attributes, not site CSS
- [x] `_partials/README.md` documents the partial beside `rune-attributes.md`

## Blocked by
- {% ref "WORK-705" /%}

## References
- {% ref "SPEC-187" /%}: D2, D3, D8, D9, the sketches, and the items to confirm.
- {% ref "SPEC-129" /%}: `include`.

## Resolution

Completed: 2026-11-03

Branch: `claude/composition-usage-rune-pages-c87ar6`
PR: refrakt-md/refrakt#770

### What was done
- `site/content/_partials/rune-intro.md`: a `section prominence="prominent"` with the package eyebrow (`link` to the plugin page, or `Core`), the `<h1>` title and the description blurb; a `bar` whose left group holds the `Composition` badge (puzzle icon at 1em), a status badge when not stable, and the schema.org badge linked to schema.org; whose right group holds `Install` (a `ref` to an Install `drawer`, plugin runes only) and `Source` (a `file-ref preview="drawer"` on the record's `source`).
- `packages/content/test/rune-intro.test.ts`: the real partial through `loadContent` — the `<h1>` sets headings, heading index and OG title; `file-ref` reads the `$row`-substituted path and the drawer holds the file; badges and actions for a composed plugin rune and a native core rune.
- `_partials/README.md` documents the partial; SPEC-187 D3 amended.

### Notes
- Reviewed in a real site build on hero, testimonial and hint, light and dark at 1280px and 390px; the trial page edits were reverted (the rollout is WORK-708). The TOC is unchanged apart from the Install drawer's anchor.
- `prominence="prominent"` matches today's docs `<h1>` (30px); the default register was smaller. Adjusted by attribute, no CSS.
- The actions are text labels, not icons: `ref` and `file-ref` take only a text `label` (amendment to D3).
- Left as is: `Source` renders monospace (file-ref's own link style) beside a plain `Install`.

{% /work %}
