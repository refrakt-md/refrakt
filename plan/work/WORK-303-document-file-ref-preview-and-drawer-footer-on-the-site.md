{% work id="WORK-303" status="done" priority="medium" complexity="simple" source="SPEC-078" tags="docs,file-ref,xref,drawer,preview,site" milestone="v0.17.0" %}

# Document `file-ref`, the shared `preview` attribute, and the drawer footer slot

Wrap up {% ref "SPEC-078" /%} on the site. Three doc pages touch the
new surface: a new `file-ref` reference page, the existing `xref` page
gains a `preview` section, and the existing `drawer` page gains a
footer / body-zone section. Cross-links round it out so readers
discover the composition story (mention in prose → expand on demand).

## Acceptance Criteria

- [x] New `site/content/runes/file-ref.md` — full reference modelled
  on `xref.md`. Sections: lead (positions `file-ref` as the path-based
  sibling of `xref` / `expand`), attributes (path / lines / label /
  preview), `repoUrl` / `repoBranch` config, GitHub URL output
  contract, `preview="drawer"` behaviour (with a live `{% preview
  source=true %}` example), label-default convention with the
  recommendation to pass an explicit `label` for symbol references.
- [x] `site/content/runes/xref.md` — new section on `preview="drawer"`
  with a worked example, the entity-without-`sourceUrl` footer-hides
  rule, and a cross-link to the same pattern in `file-ref.md`.
- [x] `site/content/runes/drawer.md` — new sections covering the
  **footer slot** + body-zone convention (`---` splits body + footer,
  same as `card`), the **always-visible chrome** behaviour (body
  scrolls, chrome pins), and the **single-block edge-to-edge** styling.
  A worked example shows the canonical standalone composition:
  `{% expand "SPEC-X" /%}` in the body, `{% ref "SPEC-X" /%}` in the
  footer.
- [x] **Composition note** in `drawer.md`: footer-zone content is
  generic markdoc — any inline content works (plain links, `{% ref %}`
  for registry-derived URLs, `{% file-ref %}` without preview,
  inline functions). Call this out loudly so readers don't think they
  need to hardcode URLs.
- [x] **Nested-preview caveat** documented in both `xref.md` and
  `file-ref.md`: a `preview="drawer"` inside a drawer footer hoists a
  nested drawer. Supported but discouraged; build emits an info note.
- [x] Cross-links: `xref` ↔ `file-ref` ↔ `drawer` ↔ `expand` ↔
  `snippet`. The Registry category in the rune catalog gains
  `file-ref` (alongside `xref` / `expand` / `collection` /
  `relationships` / `aggregate`).
- [x] `site/content/runes/_layout.md` nav and
  `site/content/runes/rune-catalog.md` table updated with the new
  page.
- [x] `site/content/docs/configuration/sites.md` Core Site
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

## Resolution

Completed: 2026-05-29

Branch: `claude/spec-078-implementation`

### What was done

- **`site/content/runes/file-ref.md`** — new full reference page. Sections: lead positioning file-ref as third Registry sibling, Linking to a file (live `{% preview source=true %}` example), Anchoring to a line range, Preview drawer (with nested-preview caveat), Label conventions, Attributes table, Site configuration (`repoUrl`/`repoBranch`), Output contract, See also.
- **`site/content/runes/xref.md`** — added "Preview drawer" section with a worked example, the entity-without-`sourceUrl` footer-hides rule, the nested-preview caveat, and a cross-link to the same pattern in `file-ref.md`.
- **`site/content/runes/drawer.md`** — added three new sections: **Body and footer zones** (with `---`-split body+footer example and the canonical expand+ref composition example, plus the composition note clarifying footer-zone is generic markdoc), **Always-visible footer** subsection describing the flex-column chrome behaviour, and **Hoisted drawers (`preview="drawer"`)** explaining how xref/file-ref reference runes hoist drawers + the author-wins collision rule.
- **`site/content/runes/_layout.md`** — added `file-ref` to the Registry nav.
- **`site/content/runes/rune-catalog.md`** — added file-ref row to the Registry table; updated xref description to mention `preview="drawer"`.
- **`site/content/docs/configuration/sites.md`** — added `repoUrl` and `repoBranch` rows to the SEO and branding table with explanations of `file-ref` URL building behaviour.
- **Threading fix** — discovered while verifying the docs render: `repoUrl`/`repoBranch` were not being passed from `SiteConfig` through the content loader chain. Extended `SiteLoaderOptions`, `VirtualSiteLoaderOptions`, `LoadContentFromTreeOptions`, and the positional `loadContent` signature; updated `refract-loader.ts` and `packages/sveltekit/src/plugin.ts` to forward both fields from the resolved site config. Verified the file-ref page now renders `<a href="https://github.com/refrakt-md/refrakt/blob/main/package.json">` for its live preview example.
- Cleaned up an unused module-level `repoUrlMissingWarnedForPage` Set left over from an early iteration of `file-ref-resolve.ts`.

### Notes

- The original criterion text mentioned **edge-to-edge** styling for single-block drawer bodies. That treatment was explored in WORK-298 but pulled out (scroll-context interactions with the snippet/codegroup chrome were too coupled). The drawer.md sections describe what was actually shipped: footer slot, body-zone `---` split, and always-visible chrome via flex-column scroll. The `data-fill` opt-in contract for a future cross-rune fill story is captured in SPEC-078 Future extensions.
- The verification pass surfaced a second `loadContent` invocation in the sveltekit Vite plugin that was missing several positional args (`xrefPatterns`, `fileRoots`, `siteConfig`, `repoUrl`, `repoBranch`). All were undefined-padded into place where the plugin doesn't carry the source data, with `activeSite` and its `repoUrl`/`repoBranch` threaded through. The doubled "missing repoUrl" build warning is gone in `npm run build`.

{% /work %}
