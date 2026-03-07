# Runes Consistency Audit

**Date**: 2026-03-07
**Scope**: All ~75 runes across core (`packages/runes/src/tags/`) and 8 community packages (`runes/*/`)
**Purpose**: Pre-release candidate audit of attribute naming, type safety, config patterns, and structural conventions

---

## Table of Contents

1. [P0 — Type Safety: Schema ↔ Tag Mismatches](#p0--type-safety-schema--tag-mismatches)
2. [P0 — Type Safety: String Booleans in Tags](#p0--type-safety-string-booleans-in-tags)
3. [P1 — Attribute Naming: `align` vs `alignment`](#p1--attribute-naming-align-vs-alignment)
4. [P1 — Attribute Naming: `style` Overloading](#p1--attribute-naming-style-overloading)
5. [P1 — Attribute Naming: `style` vs `variant`](#p1--attribute-naming-style-vs-variant)
6. [P1 — Attribute Naming: Grid Uses Different Alignment Values](#p1--attribute-naming-grid-uses-different-alignment-values)
7. [P2 — Config: Dead autoLabel in ItineraryDay](#p2--config-dead-autolabel-in-itineraryday)
8. [P2 — Config: contentWrapper Ref Naming Divergence](#p2--config-contentwrapper-ref-naming-divergence)
9. [P2 — Config: Structure Ref Naming Divergence](#p2--config-structure-ref-naming-divergence)
10. [P2 — Config: Storytelling Section autoLabel Semantics](#p2--config-storytelling-section-autolabel-semantics)
11. [P3 — Missing Enum Validation](#p3--missing-enum-validation)
12. [P3 — Default Value Inconsistencies](#p3--default-value-inconsistencies)
13. [Appendix A — Complete `style` Attribute Inventory](#appendix-a--complete-style-attribute-inventory)
14. [Appendix B — Complete `align` Attribute Inventory](#appendix-b--complete-align-attribute-inventory)
15. [Appendix C — Complete String Boolean Inventory](#appendix-c--complete-string-boolean-inventory)
16. [Appendix D — Community Package Schema ↔ Tag Matrix](#appendix-d--community-package-schema--tag-matrix)

---

## P0 — Type Safety: Schema ↔ Tag Mismatches

Schema files (in `runes/*/src/schema/`) define the TypeScript types consumed by external tooling, documentation, and type-checking. When a schema says `bidirectional: string = 'true'` but the tag file uses `@attribute({ type: Boolean })` / `bidirectional: boolean = true`, the schema is wrong.

### Bond (storytelling)

| | Schema (`runes/storytelling/src/schema/bond.ts`) | Tag (`runes/storytelling/src/tags/bond.ts`) |
|---|---|---|
| `bidirectional` | `string = 'true'` | `boolean = true` with `@attribute({ type: Boolean })` |

The tag correctly uses Boolean and converts to string at meta emission: `String(this.bidirectional)` (line 30). The **schema is stale**.

### Lore (storytelling)

| | Schema (`runes/storytelling/src/schema/lore.ts`) | Tag (`runes/storytelling/src/tags/lore.ts`) |
|---|---|---|
| `spoiler` | `string = 'false'` | `boolean = false` with `@attribute({ type: Boolean })` |

Same pattern — tag is correct, schema is stale.

### Bond `type` → `bondType` Rename

Additionally, in Bond the tag attribute is named `type` (tag line 14) but the property emitted to the renderable tree and the config modifier are both named `bondType` (tag line 38, config line 110). The schema uses `bondType` (schema line 4). This rename happens because `type` would collide with `typeof`, which is a reserved attribute in the Markdoc renderable tree. **Not a bug**, but worth documenting — the author writes `{% bond type="rivalry" %}` but the modifier/schema field is `bondType`.

---

## P0 — Type Safety: String Booleans in Tags

These tag files use `type: String` with `'true'`/`'false'` default values for attributes that are semantically boolean. This means Markdoc won't coerce `true`/`false` YAML values to boolean — the attribute always arrives as a string and must be compared with `=== 'true'`.

### Map (places)

**File**: `runes/places/src/tags/map.ts` (lines 155–162)

```typescript
@attribute({ type: String, required: false })
interactive: string = 'true';

@attribute({ type: String, required: false })
route: string = 'false';

@attribute({ type: String, required: false })
cluster: string = 'false';
```

These are passed directly to meta tags as `this.interactive` (line 205) without conversion. The config's `postTransform` (line 69–93) reads them back from meta and writes them as `data-*` attributes on the `<rf-map>` web component element. The string values propagate through the entire pipeline.

**Schema** (`runes/places/src/schema/map.ts` lines 17–20) also uses `string = 'true'`/`'false'`, so schema and tag are **consistent but both wrong**.

**Impact**: Content authors must write `{% map interactive="false" %}` (string) instead of `{% map interactive=false %}` (boolean YAML).

### Comparison (marketing)

**File**: `runes/marketing/src/tags/comparison.ts`

| Attribute | Location | Type | Default |
|---|---|---|---|
| `ComparisonColumnModel.highlighted` | line 125 | `string` | `'false'` |
| `ComparisonModel.collapse` | line 170 | `string` | `'true'` |

For `highlighted`, the value is set programmatically in `processChildren` (line 289: `highlighted: col.highlighted ? 'true' : 'false'`) — authors never type this attribute directly. The `postTransform` reads it back as `readLocalMeta(col, 'highlighted') === 'true'` (config line 330). Functionally correct but inconsistent with boolean convention.

For `collapse`, authors could write `{% comparison collapse="false" %}`. The value flows through as a meta tag. Currently unused in the postTransform (the comparison restructuring doesn't use collapse), but the config doesn't define a `collapse` modifier either — this attribute is **declared but has no effect**.

**Schema** (`runes/marketing/src/schema/comparison.ts` lines 10, 17) also uses `string = 'false'`/`'true'`, so schema and tag are consistent but both wrong.

### FormField (core)

**File**: `packages/runes/src/tags/form.ts` (line 98)

```typescript
@attribute({ type: String, required: false })
required: string = 'true';
```

Used as `const isRequired = this.required === 'true'` (line 108). This attribute is **never written by content authors** — it's programmatically generated in `FormModel.processChildren()` which creates `Ast.Node` tags with `required: 'false'` or `required: 'true'` as string attributes (lines 271, 290, 316, 346, 356, etc.).

Since Markdoc `Ast.Node` tag attributes are always strings, changing this to Boolean requires updating all ~10 `processChildren` callsites. The string approach is **functionally correct but internally inconsistent** with other runes that use `@attribute({ type: Boolean })`.

---

## P1 — Attribute Naming: `align` vs `alignment`

**Issue**: ConversationMessage uses `alignment` while every other rune with a visual alignment attribute uses `align`.

### ConversationMessage

**File**: `packages/runes/src/tags/conversation.ts` (line 13)
```typescript
@attribute({ type: String, required: false })
alignment: string = 'left';
```

**Config**: `packages/runes/src/config.ts` (line 319)
```typescript
ConversationMessage: {
    block: 'conversation-message',
    parent: 'Conversation',
    modifiers: { alignment: { source: 'meta', default: 'left' } },
},
```

**Every other rune** uses `align`:
- `figure.align` — `['left', 'center', 'right']`
- `grid.align` — `['start', 'center', 'end']`
- `mediatext.align` — `['left', 'right']`
- `pullquote.align` — `['left', 'center', 'right']`
- `textblock.align` — `['left', 'center', 'right']`
- Hero/Feature/Step configs also use `align` modifier

**Mitigating factor**: The `alignment` attribute is programmatically generated in `ConversationModel.processChildren()` (line 73: `const alignment = messageIndex % 2 === 0 ? 'left' : 'right'`). Authors never type this attribute. However, it's theoretically author-overridable via `{% conversation-message alignment="right" %}`.

**Also missing**: No `matches` validation on the `alignment` attribute — accepts any string.

**Note on Faction `alignment`**: The Faction rune (storytelling package) also has a modifier called `alignment` (config line 70), but this refers to **moral/ethical alignment** (good/evil/neutral in RPG terms), not visual alignment. This is a legitimate semantic difference — the same word, different domain. Document this to prevent confusion.

---

## P1 — Attribute Naming: `style` Overloading

The `style` attribute is used across 10 runes spanning core and community packages. While the attribute always means "a variant/mode selector," the semantic categories vary and the word collides with HTML's native `style` attribute concept.

### Core Runes Using `style` (5)

| Rune | Values | Default | Semantic |
|---|---|---|---|
| Annotate | `margin`, `tooltip`, `inline` | `margin` | **Positioning mode** — where annotation appears |
| Budget | `detailed`, `summary` | `detailed` | **Display granularity** — how much detail shown |
| Form | `stacked`, `inline`, `compact` | `stacked` | **Field layout** — how form fields are arranged |
| PullQuote | `default`, `accent`, `editorial` | `default` | **Visual variant** — color/emphasis treatment |
| Sidenote | `sidenote`, `footnote`, `tooltip` | `sidenote` | **Annotation type** — how note is presented |

### Community Package Runes Using `style` (5)

| Rune | Package | Values | Default | Semantic |
|---|---|---|---|---|
| Map | places | `street`, `satellite`, `terrain`, `dark`, `minimal` | `street` | **Map tile style** — cartographic rendering |
| Itinerary | places | `day-by-day` | `day-by-day` | **Layout mode** — content organization |
| Storyboard | storytelling | `clean` | `clean` | **Visual variant** — presentation style |
| DesignContext | design | `default` (scope) | `default` | **Scoping mode** — CSS scope |
| Preview | design | `auto` | `auto` | **Theme mode** — dark/light presentation |

### Analysis

- All 5 core runes define `matches` arrays. No value overlaps.
- Community runes Map and Storyboard define `matches` arrays; Itinerary, DesignContext, and Preview do not.
- The word "style" serves different semantic roles: positioning (Annotate), granularity (Budget), layout (Form, Itinerary), visual theme (PullQuote, Storyboard, Map), and annotation type (Sidenote).
- No rune using `style` collides with another's values, so the overloading doesn't cause runtime issues.

### Recommendation

This is a known design debt. Options for future consideration:
1. **Rename to `variant`** for visual-variant runes (PullQuote, Storyboard) — breaking change
2. **Rename to `layout`** for layout-mode runes (Form, Itinerary) — breaking change
3. **Document as convention** — `style` means "mode/variant selector" and each rune defines its own value set. No collision risk.

---

## P1 — Attribute Naming: `style` vs `variant`

**Issue**: Testimonial uses `variant` while every other rune with a visual style attribute uses `style`.

### Testimonial

**Config**: `runes/marketing/src/config.ts` (line 273)
```typescript
Testimonial: {
    block: 'testimonial',
    modifiers: { variant: { source: 'meta', default: 'card' } },
    ...
},
```

This is the **only rune** that uses `variant` instead of `style` for a visual mode selector. All other runes with a similar concept use `style`:
- Annotate: `style` (margin/tooltip/inline)
- Budget: `style` (detailed/summary)
- Form: `style` (stacked/inline/compact)
- PullQuote: `style` (default/accent/editorial)
- Sidenote: `style` (sidenote/footnote/tooltip)
- Map: `style` (street/satellite/terrain/dark/minimal)
- Storyboard: `style` (clean)

### Recommendation

Either standardize Testimonial to use `style` (breaking change for content) or standardize everything to `variant` (much larger breaking change). The current state is inconsistent but not harmful — pick one direction for the next major version.

---

## P1 — Attribute Naming: Grid Uses Different Alignment Values

**Issue**: Grid uses `start`/`center`/`end` for its `align` attribute while all other runes use `left`/`center`/`right`.

### Grid

**File**: `packages/runes/src/tags/grid.ts`
```typescript
@attribute({ type: String, required: false, matches: alignType.slice() })
align: typeof alignType[number];
```
Where `alignType = ['start', 'center', 'end']`.

### All Other Runes with `align`

| Rune | Values |
|---|---|
| figure | `left`, `center`, `right` |
| mediatext | `left`, `right` |
| pullquote | `left`, `center`, `right` |
| textblock | `left`, `center`, `right` |
| conversation-message | `left` (default, no enum) |

### Analysis

Grid uses CSS flexbox/grid terminology (`start`/`end`) which maps to `justify-content: flex-start` etc. Other runes use typographic terminology (`left`/`right`) which maps to `text-align: left` etc.

This is a **legitimate semantic distinction** — Grid is a layout primitive controlling flex alignment, while other runes control text/content alignment. However, it may confuse authors who expect consistency.

### Recommendation

Document the convention: layout primitives (Grid) use `start`/`center`/`end`; content runes use `left`/`center`/`right`. Consider whether Grid should accept both value sets as aliases.

---

## P2 — Config: Dead autoLabel in ItineraryDay

**File**: `runes/places/src/config.ts` (line 52)

```typescript
ItineraryDay: {
    block: 'itinerary-day',
    parent: 'Itinerary',
    autoLabel: { label: 'header' },
},
```

The `autoLabel` maps child element **tag names** to `data-name` values. This config says: "find child `<label>` HTML elements and give them `data-name='header'`."

However, `ItineraryDayModel.transform()` (`runes/places/src/tags/itinerary.ts` line 80) emits:

```typescript
const labelTag = new Tag('h3', {}, [this.label]);
```

The child is an `<h3>`, not a `<label>`. The autoLabel mapping **never matches** — the BEM class `.rf-itinerary-day__header` is never applied by the engine.

### Fix

Change to `{ h3: 'header' }` to match the actual tag output.

---

## P2 — Config: contentWrapper Ref Naming Divergence

Two naming conventions exist for the `contentWrapper.ref` value:

### `ref: 'body'`

| Rune | Package | Config File |
|---|---|---|
| Api | docs | `runes/docs/src/config.ts:6` |
| Symbol | docs | `runes/docs/src/config.ts:25` |

### `ref: 'content'`

| Rune | Package | Config File |
|---|---|---|
| HowTo | learning | `runes/learning/src/config.ts:6` |
| Recipe | learning | `runes/learning/src/config.ts:24` |
| Character | storytelling | `runes/storytelling/src/config.ts:6` |
| Realm | storytelling | `runes/storytelling/src/config.ts:27` |
| Lore | storytelling | `runes/storytelling/src/config.ts:48` |
| Faction | storytelling | `runes/storytelling/src/config.ts:67` |
| Event | places | `runes/places/src/config.ts:7` |

### Impact

This produces different BEM class names:
- `.rf-api__body`, `.rf-symbol__body`
- `.rf-howto__content`, `.rf-recipe__content`, `.rf-character__content`, etc.

Theme CSS must use the correct ref name for each rune. Changing either set would be a breaking change for existing CSS.

### Recommendation

Document the convention:
- `body` — used by Docs package runes (Api, Symbol) which display structured reference content
- `content` — used by Learning, Storytelling, Places package runes which display narrative/prose content

Standardize on one name for new runes going forward (suggest `content` as it's more common).

---

## P2 — Config: Structure Ref Naming Divergence

Three different ref naming patterns are used for the top structural element injected before content:

### `header`

| Rune | Package | Purpose |
|---|---|---|
| Api | docs | Method badge + path + auth display |
| Symbol | docs | Kind badge + lang + since + deprecated |
| Hint | core | Type icon + type badge |
| Budget | core | Title + summary stats |
| CodeGroup | core | Tab bar |

### `meta`

| Rune | Package | Purpose |
|---|---|---|
| HowTo | learning | Estimated time + difficulty |
| Recipe | learning | Prep time + cook time + servings + difficulty |

### `details`

| Rune | Package | Purpose |
|---|---|---|
| Event | places | Date + location + register link |

### Per-Rune Unique Names

| Rune | Package | Ref Name | Purpose |
|---|---|---|---|
| Character | storytelling | `badges` | Role badge + status badge |
| Realm | storytelling | `badges` | Type badge + scale badge |
| Faction | storytelling | `badges` | Type badge + size badge |
| Lore | storytelling | `badges` | Category badge + tags |

### Analysis

The naming reflects the semantic purpose of the injected structure:
- `header` — primary identification/classification info (Docs runes, Hint, Budget, CodeGroup)
- `meta` — supplementary metadata (Learning runes)
- `details` — event-specific info (Places)
- `badges` — tag/classification badges (Storytelling runes)

### Recommendation

While these serve similar purposes (metadata display above content), the different names are defensible since they map to different visual treatments in the theme. However, new runes should prefer `header` as the default structural ref name unless there's a strong semantic reason for an alternative.

---

## P2 — Config: Storytelling Section autoLabel Semantics

**Files**: `runes/storytelling/src/config.ts` (lines 23, 44, 86)

```typescript
CharacterSection: { block: 'character-section', parent: 'Character', autoLabel: { span: 'header' } },
RealmSection:     { block: 'realm-section',     parent: 'Realm',     autoLabel: { span: 'header' } },
FactionSection:   { block: 'faction-section',   parent: 'Faction',   autoLabel: { span: 'header' } },
```

The autoLabel `{ span: 'header' }` correctly targets the child elements emitted by the tag files — all three section models emit `new Tag('span', {}, [this.name])` (character.ts:12, realm.ts:12, faction.ts:12).

### Observation

Section "headers" are emitted as `<span>` elements rather than heading elements (`<h2>`–`<h6>`). This means:
- Accessibility: section headers aren't in the document outline
- Semantics: screen readers don't announce these as headings
- The BEM class `.rf-character-section__header` is applied via `data-name="header"` on a `<span>`

### Recommendation

Consider changing the tag output to heading elements (e.g., `new Tag('h3', ...)`) and the autoLabel to `{ h3: 'header' }` in a future version. This would improve accessibility but is a breaking change for CSS (tag selector specificity changes).

---

## P3 — Missing Enum Validation

These attributes accept finite value sets but lack `matches` validation arrays, meaning any string value is accepted without error.

### Core Runes

| Rune | Attribute | Expected Values | File |
|---|---|---|---|
| ConversationMessage | `alignment` | `left`, `right` | `packages/runes/src/tags/conversation.ts:13` |
| Error | `type` | (unknown — no enum defined) | `packages/runes/src/tags/error.ts` |

### Community Package Runes

| Rune | Package | Attribute | Expected Values | File |
|---|---|---|---|---|
| Bond | storytelling | `type` | (open-ended — relationship types) | `runes/storytelling/src/tags/bond.ts:14` |
| Bond | storytelling | `status` | `active` (default) + others? | `runes/storytelling/src/tags/bond.ts:17` |
| Lore | storytelling | `category` | (open-ended) | `runes/storytelling/src/tags/lore.ts:11` |
| Realm | storytelling | `realmType` | `place` (default) + others? | config default `place` |
| Faction | storytelling | `factionType` | (open-ended) | config has no default |
| Faction | storytelling | `alignment` | (open-ended — moral alignment) | config has no default |
| Faction | storytelling | `size` | (open-ended) | config has no default |
| Plot | storytelling | `plotType` | `arc` (default) + others? | config default `arc` |
| Itinerary | places | `style` | `day-by-day` (default) + others? | config default `day-by-day` |
| Itinerary | places | `direction` | `vertical` (default) + others? | config default `vertical` |
| Timeline | business | `direction` | `vertical` (default) + others? | config default `vertical` |
| Comparison | marketing | `layout` | `table`, `cards` | `runes/marketing/src/tags/comparison.ts:165` |
| ComparisonColumn | marketing | `highlighted` | `true`, `false` (string boolean) | `runes/marketing/src/tags/comparison.ts:125` |

### Already Validated (Good Examples)

These community rune attributes properly define `matches`:

| Rune | Package | Attribute | Values |
|---|---|---|---|
| Map | places | `style` | `street`, `satellite`, `terrain`, `dark`, `minimal` |
| Map | places | `height` | `small`, `medium`, `large`, `full` |
| Map | places | `provider` | `openstreetmap`, `mapbox` |
| Api | docs | `method` | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` |
| Character | storytelling | `status` | `alive`, `dead`, `unknown`, `missing` |
| Character | storytelling | `role` | `protagonist`, `antagonist`, `supporting`, `narrator`, `mentor` |

### Recommendation

For attributes with clear finite value sets (Comparison `layout`, Itinerary `direction`), add `matches` validation. For open-ended attributes in the storytelling domain (Bond `type`, Faction `alignment`), validation is impractical since authors define their own world-specific values — leave these unvalidated but document the convention.

---

## P3 — Default Value Inconsistencies

### Empty String vs Undefined Defaults

Two patterns exist for optional string attributes:

**Pattern A: Empty string default** (most common)
```typescript
name: string = '';
category: string = '';
tags: string = '';
```

**Pattern B: Undefined default** (rare)
```typescript
image: string | undefined = undefined;
```

Pattern A is used in the vast majority of cases. Pattern B appears primarily in Feature (`image`) and a few others. The difference matters: empty string is falsy but not `undefined`, which can cause subtle bugs in conditional checks like `if (this.image)` vs `if (this.image !== undefined)`.

### Recommendation

Standardize on empty string for optional string attributes across all runes. Reserve `undefined` for truly optional typed values (numbers, booleans) where the absence of a value has different semantics than a zero/false value.

### Figure `align` Default

`packages/runes/src/tags/figure.ts` — `align: string = ''` (empty string default).

Every other rune with `align` defaults to a valid enum value:
- textblock: `'left'`
- pullquote: `'center'`
- mediatext: `'left'`
- conversation-message: `'left'`

Figure's empty default means no `data-align` attribute and no `rf-figure--` modifier class is applied by default. This may be intentional (inherit from context), but it's inconsistent.

---

## Appendix A — Complete `style` Attribute Inventory

### Core Runes

| Rune | Config Modifier | Tag Attribute | Matches | Default | Config File |
|---|---|---|---|---|---|
| Annotate | `style` | `style` | `margin`, `tooltip`, `inline` | `margin` | `packages/runes/src/config.ts` |
| Budget | `style` | `style` | `detailed`, `summary` | `detailed` | `packages/runes/src/config.ts` |
| Form | `style` | `style` | `stacked`, `inline`, `compact` | `stacked` | `packages/runes/src/config.ts` |
| PullQuote | `style` | `style` | `default`, `accent`, `editorial` | `default` | `packages/runes/src/config.ts` |
| Sidenote | `style` | `style` | `sidenote`, `footnote`, `tooltip` | `sidenote` | `packages/runes/src/config.ts` |

### Community Runes

| Rune | Package | Config Modifier | Tag Attribute | Matches | Default | Config File |
|---|---|---|---|---|---|---|
| Map | places | `style` | `style` | `street`, `satellite`, `terrain`, `dark`, `minimal` | `street` | `runes/places/src/config.ts` |
| Itinerary | places | `style` | `style` | *(none)* | `day-by-day` | `runes/places/src/config.ts` |
| Storyboard | storytelling | `style` | `style` | *(in tag, not config)* | `clean` | `runes/storytelling/src/config.ts` |
| DesignContext | design | — | — | *(none)* | `default` | `runes/design/src/config.ts` |
| Preview | design | — | `theme` | *(none)* | `auto` | `runes/design/src/config.ts` |

### Outlier

| Rune | Package | Config Modifier | Tag Attribute | Matches | Default |
|---|---|---|---|---|---|
| **Testimonial** | marketing | `variant` | `variant` | *(in tag)* | `card` |

Testimonial is the **only rune** using `variant` instead of `style`.

---

## Appendix B — Complete `align` Attribute Inventory

| Rune | Attribute Name | Type | Matches | Default | Values | Source |
|---|---|---|---|---|---|---|
| **ConversationMessage** | **`alignment`** | String | **None** | `left` | *(unvalidated)* | `packages/runes/src/tags/conversation.ts:13` |
| Figure | `align` | String | Yes | `''` (empty) | `left`, `center`, `right` | `packages/runes/src/tags/figure.ts` |
| **Grid** | `align` | String | Yes | *(undefined)* | **`start`, `center`, `end`** | `packages/runes/src/tags/grid.ts` |
| MediaText | `align` | String | Yes | `left` | `left`, `right` | `packages/runes/src/tags/mediatext.ts` |
| PullQuote | `align` | String | Yes | `center` | `left`, `center`, `right` | `packages/runes/src/tags/pullquote.ts` |
| TextBlock | `align` | String | Yes | `left` | `left`, `center`, `right`, `justify` | `packages/runes/src/tags/textblock.ts` |
| Hero (config) | `align` | — | — | `start` | *(noBemClass — CSS prop)* | `runes/marketing/src/config.ts` |
| Feature (config) | `align` | — | — | `start` | *(noBemClass — CSS prop)* | `runes/marketing/src/config.ts` |
| Step (config) | `align` | — | — | `start` | *(noBemClass — CSS prop)* | `runes/marketing/src/config.ts` |

**Bolded rows** indicate inconsistencies: `alignment` naming and `start/center/end` values.

Note: Hero/Feature/Step `align` with `noBemClass: true` maps to `--split-align` CSS custom property and uses `start` default — this aligns with Grid's convention (layout primitives use `start`/`end`).

---

## Appendix C — Complete String Boolean Inventory

Every instance where `type: String` is used with `'true'`/`'false'` defaults for boolean-concept attributes.

### Community Package Tags

| Rune | Package | Attribute | Default | File | Line |
|---|---|---|---|---|---|
| Map | places | `interactive` | `'true'` | `runes/places/src/tags/map.ts` | 156 |
| Map | places | `route` | `'false'` | `runes/places/src/tags/map.ts` | 159 |
| Map | places | `cluster` | `'false'` | `runes/places/src/tags/map.ts` | 162 |
| ComparisonColumn | marketing | `highlighted` | `'false'` | `runes/marketing/src/tags/comparison.ts` | 125 |
| Comparison | marketing | `collapse` | `'true'` | `runes/marketing/src/tags/comparison.ts` | 170 |

### Core Tags

| Rune | Attribute | Default | File | Line | Notes |
|---|---|---|---|---|---|
| FormField | `required` | `'true'` | `packages/runes/src/tags/form.ts` | 98 | Internal only — set by processChildren |

### Community Package Schemas (Stale — Tag Uses Boolean)

| Rune | Package | Schema Attribute | Schema Type | Tag Attribute | Tag Type |
|---|---|---|---|---|---|
| Bond | storytelling | `bidirectional` | `string = 'true'` | `bidirectional` | `boolean = true` |
| Lore | storytelling | `spoiler` | `string = 'false'` | `spoiler` | `boolean = false` |

### Community Package Schemas (Consistent — Both Use String)

| Rune | Package | Attribute | Schema Type | Tag Type |
|---|---|---|---|---|
| Map | places | `interactive` | `string = 'true'` | `string = 'true'` |
| Map | places | `route` | `string = 'false'` | `string = 'false'` |
| Map | places | `cluster` | `string = 'false'` | `string = 'false'` |
| ComparisonColumn | marketing | `highlighted` | `string = 'false'` | `string = 'false'` |
| Comparison | marketing | `collapse` | `string = 'true'` | `string = 'true'` |

---

## Appendix D — Community Package Schema ↔ Tag Matrix

Complete listing of where schemas and tags agree or disagree on types.

### Storytelling Package

| Class | Field | Schema Type | Tag Type | Match? |
|---|---|---|---|---|
| Bond.bidirectional | `bidirectional` | `string = 'true'` | `boolean = true` | **MISMATCH** |
| Bond.bondType | `bondType` | `string = ''` | (tag uses `type`, emits as `bondType`) | Rename |
| Lore.spoiler | `spoiler` | `string = 'false'` | `boolean = false` | **MISMATCH** |
| Character.* | all fields | string | string | Match |
| Realm.* | all fields | string | string | Match |
| Faction.* | all fields | string | string | Match |
| Plot.* | all fields | string | string | Match |

### Places Package

| Class | Field | Schema Type | Tag Type | Match? |
|---|---|---|---|---|
| Map.interactive | `interactive` | `string = 'true'` | `string = 'true'` | Match (both wrong) |
| Map.route | `route` | `string = 'false'` | `string = 'false'` | Match (both wrong) |
| Map.cluster | `cluster` | `string = 'false'` | `string = 'false'` | Match (both wrong) |
| Map.style | `style` | `string = 'street'` | `typeof styleType[number] = 'street'` | Match |
| Map.height | `height` | `string = 'medium'` | `typeof heightType[number] = 'medium'` | Match |
| Map.provider | `provider` | `string = 'openstreetmap'` | `typeof providerType[number] = 'openstreetmap'` | Match |

### Marketing Package

| Class | Field | Schema Type | Tag Type | Match? |
|---|---|---|---|---|
| ComparisonColumn.highlighted | `highlighted` | `string = 'false'` | `string = 'false'` | Match (both wrong) |
| Comparison.collapse | `collapse` | `string = 'true'` | `string = 'true'` | Match (both wrong) |
| Comparison.layout | `layout` | `string = 'table'` | `string = ''` | **DEFAULT MISMATCH** |
| Comparison.rowLabels | `rowLabels` | `string = '[]'` | `string = '[]'` | Match (JSON string) |

---

## Summary of All Findings

| ID | Priority | Category | Finding | Breaking? | Recommendation |
|---|---|---|---|---|---|
| 1 | P0 | Type Safety | Bond schema: `bidirectional` is string, tag is boolean | No | Fix schema |
| 2 | P0 | Type Safety | Lore schema: `spoiler` is string, tag is boolean | No | Fix schema |
| 3 | P0 | Type Safety | Map tag+schema: `interactive/route/cluster` are string booleans | Content | Fix both to boolean |
| 4 | P0 | Type Safety | Comparison tag+schema: `highlighted/collapse` are string booleans | Content | Fix both to boolean |
| 5 | P0 | Type Safety | FormField tag: `required` is string boolean | No (internal) | Document; fix optionally |
| 6 | P1 | Naming | ConversationMessage uses `alignment` not `align` | Content | Rename to `align` |
| 7 | P1 | Naming | ConversationMessage `alignment` has no `matches` validation | No | Add matches |
| 8 | P1 | Naming | `style` attribute overloaded across 10 runes | N/A | Document convention |
| 9 | P1 | Naming | Testimonial uses `variant` while all others use `style` | Content | Standardize in major |
| 10 | P1 | Naming | Grid `align` uses `start/center/end` vs `left/center/right` | N/A | Document convention |
| 11 | P2 | Config | ItineraryDay autoLabel `{ label: 'header' }` is dead config | CSS | Fix to `{ h3: 'header' }` |
| 12 | P2 | Config | contentWrapper ref `body` vs `content` inconsistency | CSS | Document convention |
| 13 | P2 | Config | Structure ref naming divergence (`header`/`meta`/`details`/`badges`) | CSS | Document convention |
| 14 | P2 | Config | Storytelling section headers are `<span>` not heading elements | CSS + A11y | Fix in future for a11y |
| 15 | P3 | Validation | Multiple community attrs missing `matches` enum validation | No | Add selectively |
| 16 | P3 | Defaults | Figure `align` defaults to empty string, others default to value | No | Consider defaulting |
| 17 | P3 | Defaults | Comparison schema `layout` defaults to `'table'`, tag to `''` | No | Align defaults |
