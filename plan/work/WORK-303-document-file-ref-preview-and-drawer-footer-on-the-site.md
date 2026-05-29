{% work id="WORK-303" status="ready" priority="medium" complexity="simple" source="SPEC-078" tags="docs,file-ref,xref,drawer,preview,site" milestone="v0.17.0" %}

# Document `file-ref`, the shared `preview` attribute, and the drawer footer slot

Wrap up {% ref "SPEC-078" /%} on the site. Three doc pages touch the
new surface: a new `file-ref` reference page, the existing `xref` page
gains a `preview` section, and the existing `drawer` page gains a
footer / body-zone section. Cross-links round it out so readers
discover the composition story (mention in prose → expand on demand).

## Acceptance Criteria

- [ ] New `site/content/runes/file-ref.md` — full reference modelled
  on `xref.md`. Sections: lead (positions `file-ref` as the path-based
  sibling of `xref` / `expand`), attributes (path / lines / label /
  preview), `repoUrl` / `repoBranch` config, GitHub URL output
  contract, `preview="drawer"` behaviour (with a live `{% preview
  source=true %}` example), label-default convention with the
  recommendation to pass an explicit `label` for symbol references.
- [ ] `site/content/runes/xref.md` — new section on `preview="drawer"`
  with a worked example, the entity-without-`sourceUrl` footer-hides
  rule, and a cross-link to the same pattern in `file-ref.md`.
- [ ] `site/content/runes/drawer.md` — new sections covering the
  **footer slot** + body-zone convention (`---` splits body + footer,
  same as `card`), the **always-visible chrome** behaviour (body
  scrolls, chrome pins), and the **single-block edge-to-edge** styling.
  A worked example shows the canonical standalone composition:
  `{% expand "SPEC-X" /%}` in the body, `{% ref "SPEC-X" /%}` in the
  footer.
- [ ] **Composition note** in `drawer.md`: footer-zone content is
  generic markdoc — any inline content works (plain links, `{% ref %}`
  for registry-derived URLs, `{% file-ref %}` without preview,
  inline functions). Call this out loudly so readers don't think they
  need to hardcode URLs.
- [ ] **Nested-preview caveat** documented in both `xref.md` and
  `file-ref.md`: a `preview="drawer"` inside a drawer footer hoists a
  nested drawer. Supported but discouraged; build emits an info note.
- [ ] Cross-links: `xref` ↔ `file-ref` ↔ `drawer` ↔ `expand` ↔
  `snippet`. The Registry category in the rune catalog gains
  `file-ref` (alongside `xref` / `expand` / `collection` /
  `relationships` / `aggregate`).
- [ ] `site/content/runes/_layout.md` nav and
  `site/content/runes/rune-catalog.md` table updated with the new
  page.
- [ ] `site/content/docs/configuration/sites.md` Core Site
  Configuration table reflects `repoUrl` / `repoBranch` (delivered in
  {% ref "WORK-299" /%}, documented here in context of `file-ref`).

## Approach

Standard docs-page rhythm — match the structure of `xref.md` and the
recently-shipped `aggregate.md` (live previews via `{% preview
source=true %}`, attribute tables, output contract, See Also). The
Registry category framing established in v0.16 is the natural home
for `file-ref` — third path-based sibling of `xref` / `expand`.

The drawer-page changes are additive (existing content unchanged); the
footer / body-zone / edge-to-edge sections sit alongside the existing
addressable-from-xref sections.

## Dependencies

- {% ref "WORK-301" /%} — the `file-ref` rune itself, so the live
  previews on `file-ref.md` actually render.
- {% ref "WORK-302" /%} — the `xref preview` extension, so the
  `xref.md` preview examples render.

## References

- {% ref "SPEC-078" /%}

{% /work %}
