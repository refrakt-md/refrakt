{% work id="WORK-234" status="ready" priority="medium" complexity="trivial" tags="runes, badge, inline, core, metadata" source="SPEC-054" milestone="v0.14.3" %}

# `{% badge %}` core inline rune

Ship a new core inline rune for badges — `{% badge %}Label{% /badge %}` — whose visual variant comes from the universal metadata dimensions defined by {% ref "SPEC-024" /%} (`data-meta-sentiment`, `data-meta-rank`, `data-meta-type`). Label is children content (free-form text, naturally localised, no hard-coded English in core). The base `.rf-badge` provides pill shape; all colour / weight / emphasis comes from the existing universal metadata CSS in `packages/lumina/styles/dimensions/metadata.css` — no per-variant BEM modifiers.

General-purpose primitive — used in the mega nav variant for status indicators on items, but useful in many contexts (commerce: "Popular" / "Sale"; content: "Featured" / "Sponsored"; status: "Active" / "Archived"; identity: "Verified" / "Staff"; recency: "Updated"; arbitrary categorical tagging).

Independent of the rest of the mega work — can ship in parallel.

## Acceptance Criteria

- [ ] New rune at `packages/runes/src/tags/badge.ts`
- [ ] Rune takes its label as children content (inline text), not as an attribute
- [ ] Accepts `sentiment` attribute with values `positive` | `negative` | `caution` | `neutral` (default `neutral`) — matches existing metadata-system sentiment enum exactly
- [ ] Accepts `rank` attribute with values `primary` | `secondary` (no default; omitted attribute emits no `data-meta-rank`) — matches existing metadata-system rank enum
- [ ] Accepts `type` attribute with values `status` | `category` | `quantity` | `temporal` | `tag` | `id` (default `tag`) — matches existing metadata-system metaType enum
- [ ] No new attribute enums are introduced — all three attributes use the value sets already defined by SPEC-024 (`packages/transform/src/types.ts` `StructureEntry` interface)
- [ ] Identity transform output: `<span class="rf-badge" data-meta-sentiment="…" data-meta-rank="…" data-meta-type="…">{children}</span>` — no per-variant BEM modifier classes (e.g. no `.rf-badge--positive`)
- [ ] Engine config entry added to `packages/runes/src/config.ts` with block `'badge'` and modifiers that emit the three `data-meta-*` attributes (likely reusing the existing `metaType`, `metaRank`, `sentimentMap` config fields rather than rolling new modifier sources)
- [ ] Inline placement works inside paragraphs, headings, table cells, list items, link text — anywhere markdown allows inline content
- [ ] Children rendering preserves text exactly (no transformation, casing, etc.); accessible to screen readers
- [ ] Lumina ships base `.rf-badge` CSS in a new `packages/lumina/styles/runes/badge.css`, imported from `packages/lumina/index.css` — pill shape only (inline-flex, small padding, rounded full, small font, uppercase letter-spacing optional)
- [ ] Colour / weight / emphasis styling for each sentiment / rank combination inherits from the existing `packages/lumina/styles/dimensions/metadata.css` rules — verified by visual inspection that all four sentiments × both ranks render as expected
- [ ] Sentiment defaults to `neutral` so `{% badge %}Frontend{% /badge %}` renders as a plain neutral pill without any required attribute
- [ ] CSS coverage tests recognise `.rf-badge` (the base shape); per-variant coverage is already validated by SPEC-024 / SPEC-025 metadata CSS coverage tests
- [ ] `npx refrakt inspect badge` produces expected HTML output for a representative call
- [ ] `npx refrakt inspect badge --sentiment=positive --rank=primary` produces output with both data attributes present
- [ ] New rune reference page at `site/content/runes/badge.md` covering all attribute combinations, the metadata-dimension inheritance, accessibility notes (label is real text, not pseudo-content), and a recipes section with the previously-proposed dev-lifecycle uses (`{% badge sentiment="positive" %}New{% /badge %}`, `{% badge sentiment="caution" %}Beta{% /badge %}`, etc.) as patterns rather than built-ins
- [ ] At least one site page demonstrates badge usage in prose (e.g. a docs page marking an experimental feature with `{% badge sentiment="caution" %}Beta{% /badge %}`)

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

{% /work %}
