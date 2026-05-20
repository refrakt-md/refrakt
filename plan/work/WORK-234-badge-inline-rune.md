{% work id="WORK-234" status="ready" priority="medium" complexity="trivial" tags="runes, badge, inline, core, lumina" source="SPEC-054" milestone="v0.14.3" %}

# `{% badge %}` core inline rune

Ship a new core inline rune for status pills — `{% badge type="new" %}`, `{% badge type="beta" %}`, etc. Used in the mega nav variant for "New / Beta / Soon" indicators on nav items, but defined as a general-purpose inline rune since the use cases extend beyond nav (changelog entries marking added APIs, pricing rows marking popular tiers, doc sidebars marking unstable features).

Lives in `packages/runes/src/tags/badge.ts` alongside other core runes. Independent of the rest of the mega work — can ship in parallel with anything else in the milestone.

## Acceptance Criteria

- [ ] New rune at `packages/runes/src/tags/badge.ts`
- [ ] Accepts a `type` attribute with values `new` | `beta` | `soon` | `deprecated` | `custom` (custom requires a `label` attribute)
- [ ] Accepts an optional `label` attribute; overrides the default label for built-in types; required for `type="custom"`
- [ ] Default labels (English): `new` → "New", `beta` → "Beta", `soon` → "Soon", `deprecated` → "Deprecated"; the map lives in the rune config so themes/locales can override
- [ ] Identity transform output: `<span class="rf-badge rf-badge--{type}" data-type="{type}">{label}</span>`
- [ ] Label is a real text node (accessible to screen readers, not CSS pseudo-content)
- [ ] Inline placement works inside paragraphs, headings, table cells, list items — anywhere markdown allows inline content
- [ ] Engine config entry added to `packages/runes/src/config.ts` with block `'badge'` and the `type` modifier
- [ ] Lumina ships CSS for all four built-in types in a new `packages/lumina/styles/runes/badge.css`, imported from `packages/lumina/index.css`
- [ ] CSS uses design tokens — `new` = accent color, `beta` = warning color, `soon` = info / muted color, `deprecated` = strikethrough or muted color. No hard-coded hexes.
- [ ] CSS coverage tests recognise `.rf-badge`, `.rf-badge--new`, `.rf-badge--beta`, `.rf-badge--soon`, `.rf-badge--deprecated`, `.rf-badge--custom`
- [ ] `npx refrakt inspect badge --type=new` produces expected HTML output
- [ ] `npx refrakt inspect badge --type=custom --label="Free"` produces expected output with the custom label
- [ ] New rune reference page at `site/content/runes/badge.md` covering all attribute values, default labels, custom usage, and accessibility notes
- [ ] At least one site page demonstrates badge usage in prose (e.g. a docs page marking an experimental feature)

## Approach

**Schema.** Small inline rune. Use the existing rune authoring patterns from `packages/runes/src/tags/`. Likely uses `createContentModelSchema` with `contentModel: { type: 'sequence', fields: [] }` (no children) or just a plain rune definition since the content is attribute-driven.

The transform takes `(attrs)` and returns a `createComponentRenderable(...)` wrapping a single `span` with the right class and data attribute. Label resolution: if `label` is set, use it. Otherwise look up `type` in a default-labels map and use that.

**Engine config.** Add to `packages/runes/src/config.ts`:

```ts
Badge: {
  block: 'badge',
  tag: 'span',
  modifiers: {
    type: { source: 'meta', default: 'new' },
  },
},
```

**Lumina CSS.** Small pill shape — inline-flex, small padding, rounded full, small font, uppercase tracking. Per-type color via `data-type` selector:

```css
.rf-badge { /* base shape */ }
.rf-badge[data-type="new"]      { background: var(--rf-color-accent-subtle); color: var(--rf-color-accent-text); }
.rf-badge[data-type="beta"]     { background: var(--rf-color-warning-subtle); color: var(--rf-color-warning-text); }
.rf-badge[data-type="soon"]     { background: var(--rf-color-info-subtle); color: var(--rf-color-info-text); }
.rf-badge[data-type="deprecated"] { background: var(--rf-color-muted-subtle); color: var(--rf-color-muted-text); text-decoration: line-through; }
```

Confirm the design-token names against the Lumina tokens reference — these are illustrative.

**Reference page.** `site/content/runes/badge.md` — follow the structure of an existing simple rune reference page. Include: usage examples for each built-in type, custom usage with `label`, inline-placement examples in prose, accessibility note.

## Dependencies

None — independent of the SPEC-055 work and the rest of SPEC-054. Can ship first or in parallel.

## References

- {% ref "SPEC-054" /%} — Badge rune definition, default labels, output contract
- `packages/runes/src/tags/` — Existing rune implementations for reference
- `packages/lumina/styles/runes/` — Existing per-rune CSS files for reference

{% /work %}
