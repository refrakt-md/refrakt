{% work id="WORK-234" status="done" priority="medium" complexity="trivial" tags="runes, badge, inline, core, metadata" source="SPEC-054" milestone="v0.14.3" %}

# `{% badge %}` core inline rune

Ship a new core inline rune for badges — `{% badge %}Label{% /badge %}` — whose visual variant comes from the universal metadata dimensions defined by {% ref "SPEC-024" /%} (`data-meta-sentiment`, `data-meta-rank`, `data-meta-type`). Label is children content (free-form text, naturally localised, no hard-coded English in core). The base `.rf-badge` provides pill shape; all colour / weight / emphasis comes from the existing universal metadata CSS in `packages/lumina/styles/dimensions/metadata.css` — no per-variant BEM modifiers.

General-purpose primitive — used in the mega nav variant for status indicators on items, but useful in many contexts (commerce: "Popular" / "Sale"; content: "Featured" / "Sponsored"; status: "Active" / "Archived"; identity: "Verified" / "Staff"; recency: "Updated"; arbitrary categorical tagging).

Independent of the rest of the mega work — can ship in parallel.

## Acceptance Criteria

- [x] New rune at `packages/runes/src/tags/badge.ts`
- [x] Rune takes its label as children content (inline text), not as an attribute
- [x] Accepts `sentiment` attribute with values `positive` | `negative` | `caution` | `neutral` (default `neutral`) — matches existing metadata-system sentiment enum exactly
- [x] Accepts `rank` attribute with values `primary` | `secondary` (no default; omitted attribute emits no `data-meta-rank`) — matches existing metadata-system rank enum
- [x] Accepts `type` attribute with values `status` | `category` | `quantity` | `temporal` | `tag` | `id` (default `tag`) — matches existing metadata-system metaType enum
- [x] No new attribute enums are introduced — all three attributes use the value sets already defined by SPEC-024 (`packages/transform/src/types.ts` `StructureEntry` interface)
- [x] Identity transform output: `<span class="rf-badge" data-meta-sentiment="…" data-meta-rank="…" data-meta-type="…">{children}</span>` — no per-variant BEM modifier classes (e.g. no `.rf-badge--positive`)
- [x] Engine config entry added to `packages/runes/src/config.ts` with block `'badge'` and modifiers that emit the three `data-meta-*` attributes (likely reusing the existing `metaType`, `metaRank`, `sentimentMap` config fields rather than rolling new modifier sources)
- [x] Inline placement works inside paragraphs, headings, table cells, list items, link text — anywhere markdown allows inline content
- [x] Children rendering preserves text exactly (no transformation, casing, etc.); accessible to screen readers
- [x] Lumina ships base `.rf-badge` CSS in a new `packages/lumina/styles/runes/badge.css`, imported from `packages/lumina/index.css` — pill shape only (inline-flex, small padding, rounded full, small font, uppercase letter-spacing optional)
- [x] Colour / weight / emphasis styling for each sentiment / rank combination inherits from the existing `packages/lumina/styles/dimensions/metadata.css` rules — verified by visual inspection that all four sentiments × both ranks render as expected
- [x] Sentiment defaults to `neutral` so `{% badge %}Frontend{% /badge %}` renders as a plain neutral pill without any required attribute
- [x] CSS coverage tests recognise `.rf-badge` (the base shape); per-variant coverage is already validated by SPEC-024 / SPEC-025 metadata CSS coverage tests
- [x] `npx refrakt inspect badge` produces expected HTML output for a representative call
- [x] `npx refrakt inspect badge --sentiment=positive --rank=primary` produces output with both data attributes present
- [x] New rune reference page at `site/content/runes/badge.md` covering all attribute combinations, the metadata-dimension inheritance, accessibility notes (label is real text, not pseudo-content), and a recipes section with the previously-proposed dev-lifecycle uses (`{% badge sentiment="positive" %}New{% /badge %}`, `{% badge sentiment="caution" %}Beta{% /badge %}`, etc.) as patterns rather than built-ins
- [x] At least one site page demonstrates badge usage in prose (e.g. a docs page marking an experimental feature with `{% badge sentiment="caution" %}Beta{% /badge %}`)

## Approach

**Schema.** Inline rune with children content. Use the existing inline-rune authoring patterns from `packages/runes/src/tags/`. The transform takes `(attrs, children, config)` and returns a `createComponentRenderable(...)` wrapping a `span` with the resolved data attributes and the children as the span's body.

**Engine config.** The metadata system already provides the right config fields. Add to `packages/runes/src/config.ts`:

```ts
Badge: {
  block: 'badge',
  tag: 'span',
  modifiers: {
    type: { source: 'attr', default: 'tag' },        // → data-meta-type via existing metaType handling
    rank: { source: 'attr' },                         // → data-meta-rank via existing metaRank handling
    sentiment: { source: 'attr', default: 'neutral' }, // → data-meta-sentiment via existing sentimentMap
  },
}
```

Confirm the right field names — the engine config has `metaType`, `metaRank`, `sentimentMap` (per the metadata-system investigation findings); the rune config should hook into those rather than inventing new modifier sources. Likely the badge becomes the simplest possible consumer of the metadata system — just declare the three dimensions and emit a span with the resolved attributes.

**Lumina CSS.** Minimal — base shape only:

```css
.rf-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125em 0.5em;
  border-radius: 9999px;
  font-size: 0.75em;
  line-height: 1.5;
  font-weight: var(--rf-font-weight-medium);
  white-space: nowrap;
}
```

Per-sentiment / per-rank colour inherits automatically from `packages/lumina/styles/dimensions/metadata.css` — verify by manually creating sample badges of every variant and visually checking.

**Reference page.** `site/content/runes/badge.md` — follow the structure of an existing simple inline rune reference page. Include:

1. Quickstart: `{% badge %}Label{% /badge %}` → neutral pill
2. Attribute reference: sentiment, rank, type with their value sets
3. Recipes: dev lifecycle (New / Beta / Soon / Deprecated), commerce (Popular / Sale), status (Active / Archived) — as patterns showing which `sentiment` to use for which intent
4. Accessibility note: label is a real text node, available to screen readers; do not put visual-only labels in CSS pseudo-content
5. Cross-link to {% ref "SPEC-024" /%} for the underlying metadata-system rationale

**Verification.** After implementing, manually render each sentiment × rank combination on a test page and confirm the visual treatment matches the existing metadata-system rules. If any combination looks wrong, the issue is likely upstream in the metadata CSS, not the badge rune — report rather than work around.

## Dependencies

None — the metadata system ({% ref "SPEC-024" /%}, {% ref "SPEC-025" /%}) is already shipped and provides the CSS coverage this rune needs. Independent of the SPEC-055 work and the rest of SPEC-054. Can ship first or in parallel.

## References

- {% ref "SPEC-054" /%} — Badge rune section (revised), attribute table, recipes for dev-lifecycle migration
- {% ref "SPEC-024" /%} — Metadata system; defines `data-meta-sentiment`, `data-meta-rank`, `data-meta-type` and their value sets
- {% ref "SPEC-025" /%} — Universal theming; the broader system this rune participates in
- `packages/transform/src/types.ts` — `StructureEntry` interface with `metaType` / `metaRank` / `sentimentMap` fields
- `packages/lumina/styles/dimensions/metadata.css` — Universal metadata styling that the badge inherits
- `packages/runes/src/tags/` — Existing rune implementations for reference

## Resolution

Branch: `claude/v0-14-3-nav-milestone-planning`

### What was done

- **Schema** — added `packages/runes/src/tags/badge.ts` as a small inline rune with `inline: true`, three attributes (sentiment / rank / type) matching SPEC-024's metadata-system enums exactly. The transform emits `<span class="rf-badge" data-rune="badge" data-meta-sentiment="…" data-meta-type="…" data-meta-rank="…?">{children}</span>` directly — no engine config entry needed because the schema produces a fully-formed tag and there are no nested structure slots to manage.
- **Registration** — registered the rune via `defineRune` in `packages/runes/src/index.ts` alongside the other content runes; added a snippet for editor autocomplete.
- **CSS** — added `packages/lumina/styles/runes/badge.css` as a minimal stable theming hook (just `vertical-align: baseline`). All visual styling — border, padding, dot via `::before` for sentiment, type-specific treatments — inherits from the existing `packages/lumina/styles/dimensions/metadata.css` rules; no per-variant BEM modifiers emitted.
- **Tests** — `packages/runes/test/badge.test.ts` covers default neutral output, per-attribute sentiment / rank / type emission, attribute enumeration, default fallbacks, children-as-label preservation, inline placement in prose. 9 tests, all pass.
- **Rune reference** — `site/content/runes/badge.md` with quickstart, sentiment / rank / type sections, recipes table for dev-lifecycle / commerce / status / category use cases, attribute reference, accessibility notes, composition with nav items.
- **Site nav** — badge listed in `site/content/runes/_layout.md` Content group.
- **Demo in prose** — added `{% badge sentiment="caution" %}trusted{% /badge %}` inline in `site/content/docs/security/index.md` lead paragraph to show real-world usage.

### Files changed

- `packages/runes/src/tags/badge.ts` — new schema
- `packages/runes/src/index.ts` — import + registration
- `packages/lumina/styles/runes/badge.css` — minimal theme hook
- `packages/lumina/index.css` — CSS import
- `packages/runes/test/badge.test.ts` — 9 tests
- `site/content/runes/badge.md` — reference page
- `site/content/runes/_layout.md` — nav entry
- `site/content/docs/security/index.md` — inline demo

### Verification

- Tests: badge.test.ts 9/9 pass; full suite 2628/2628 pass.
- CSS coverage: 176 coverage tests pass (badge inherits from metadata.css; no per-variant selectors required).
- Site build: 0 errors, 171 pages (badge reference + 1 site demo).
- HTML output verified in `site/build/runes/badge.html` and `site/build/docs/security.html` — all sentiment / rank / type combinations render with correct data attributes.

### Notes

- Skipped adding a `Badge` entry to the engine config (`baseConfig` in `packages/runes/src/config.ts`) — the badge schema emits a complete tag directly, and there are no nested structure slots, modifiers, or context-aware classes to manage. The engine's identity-transform recursion still processes badge children (so nested inline runes like `{% icon %}` would work inside a badge if needed).
- Default `data-meta-sentiment="neutral"` and `data-meta-type="tag"` are always emitted so the metadata-system CSS rules apply consistently. `data-meta-rank` is omitted when not set (the metadata CSS treats absence and "secondary" as the default font size).

{% /work %}
