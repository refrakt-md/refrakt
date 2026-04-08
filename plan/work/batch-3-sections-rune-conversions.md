{% work id="WORK-002" status="done" priority="medium" tags="runes, content-model" %}

# Batch 3: Convert Runes Using `sections` Resolver

## Context

The `sections` resolver pattern was implemented in the previous step (commit `fb923af`). It provides heading-based splitting with `emitTag`, `headingExtract`, and heading auto-detection. This batch converts the 8 runes that are now unblocked by the sections resolver, replacing their imperative Model subclasses with declarative `createContentModelSchema()`.

5 runes are deferred due to complexity beyond what sections provides: tabs (image extraction from heading AST), bento (tiered sizing logic), steps (SplitLayoutModel base + complex step creation), nav (auto/manual/grouped modes), storyboard (image-based splitting).

---

## Phase 0: Dynamic `contentModel` Support

**Problem**: Accordion, reveal, timeline, changelog, and pricing all have a `headingLevel` attribute that determines which heading level to split on. The `contentModel` field in `ContentModelSchemaOptions` is currently static — it needs to support being a function of the resolved attributes so `sectionHeading` can be dynamic.

**Files**:
- `packages/runes/src/lib/index.ts` — line 308 and lines 382-384

**Change**:
```typescript
// ContentModelSchemaOptions.contentModel type (line 308):
contentModel: ContentModel | ((attrs: Record<string, any>) => ContentModel);

// In createContentModelSchema transform (lines 382-384):
const resolvedModel = typeof options.contentModel === 'function'
  ? options.contentModel(attrs)
  : options.contentModel;
const { content, tintNode, bgNode } = resolveContentModel(node.children, resolvedModel);
```

---

## Group A: Simple `emitTag` Conversions

### Accordion (`packages/runes/src/tags/accordion.ts`)

**Current**: AccordionModel + AccordionItemModel, `headingsToList()` → `Ast.Node('tag', { name }, body, 'accordion-item')`, `@group` routing.

**Convert to**:
- `accordion-item` schema: keep `createSchema(AccordionItemModel)` as-is (it's a child rune with its own transform)
- `accordion` schema: `createContentModelSchema` with:
  - `base: undefined` (no base model needed)
  - `attributes`: `headingLevel`, `multiple`
  - `contentModel: (attrs) => ({ type: 'sections', sectionHeading: attrs.headingLevel ? 'heading:'+attrs.headingLevel : 'heading', emitTag: 'accordion-item', emitAttributes: { name: '$heading' }, fields: [{ name: 'header', match: 'heading|paragraph', optional: true, greedy: true }], sectionModel: { type: 'sequence', fields: [{ name: 'body', match: 'any', optional: true, greedy: true }] } })`
  - `transform`: receives `{ header, sections }`, uses `pageSectionProperties` for header, transforms sections via `Markdoc.transform`, filters for AccordionItem typeof

**Test**: `packages/runes/test/tags/accordion.test.ts` — existing tests must pass unchanged

### Reveal (`packages/runes/src/tags/reveal.ts`)

**Current**: Identical pattern to accordion. RevealModel + RevealStepModel.

**Convert to**: Same approach as accordion but with `emitTag: 'reveal-step'`, `emitAttributes: { name: '$heading' }`.

**Test**: `packages/runes/test/tags/reveal.test.ts`

---

## Group B: `headingExtract` / Manual Parsing

### Timeline (`runes/business/src/tags/timeline.ts`)

**Current**: TimelineModel + TimelineEntryModel. Heading parsed with `DATE_LABEL_PATTERN = /^(.+?)\s*[-–—:]\s*(.+)$/`.

**Convert to**: `createContentModelSchema` with:
- `contentModel: (attrs) => ({ type: 'sections', sectionHeading: ..., emitTag: 'timeline-entry', emitAttributes: { date: '$date', label: '$label' }, headingExtract: { fields: [{ name: 'date', match: 'text', pattern: /^(.+?)\s*[-–—:]\s*/, optional: true }, { name: 'label', match: 'text', pattern: 'remainder' }] }, sectionModel: { type: 'sequence', fields: [{ name: 'body', match: 'any', optional: true, greedy: true }] } })`
- TimelineEntryModel child rune: keep `createSchema(TimelineEntryModel)`

**Test**: `runes/business/test/tags/timeline.test.ts`

### Changelog (`runes/docs/src/tags/changelog.ts`)

**Current**: ChangelogModel + ChangelogReleaseModel. Heading parsed with `VERSION_DATE_PATTERN`. Fallback: when no separator, version=full heading text, date=''.

**Convert to**: Use non-emitTag sections approach since the heading parsing has a fallback that doesn't fit headingExtract cleanly:
- `contentModel: (attrs) => ({ type: 'sections', sectionHeading: ..., sectionModel: { type: 'sequence', fields: [{ name: 'body', match: 'any', optional: true, greedy: true }] } })`
- `transform`: manually parse `$heading` text from each section with the existing pattern+fallback logic, then build the renderable

**Test**: `runes/docs/test/tags/changelog.test.ts`

### Pricing (`runes/marketing/src/tags/pricing.ts`)

**Current**: PricingModel + TierModel. Selective conversion — only headings matching `NAME_PRICE_PATTERN` become tiers. Non-matching headings stay as-is. Level auto-detection from first *matching* heading.

**Convert to**: Use non-emitTag sections approach since selective conversion isn't supported by emitTag:
- `contentModel: (attrs) => ({ type: 'sections', sectionHeading: ..., sectionModel: { type: 'sequence', fields: [{ name: 'body', match: 'any', optional: true, greedy: true }] }, fields: [{ name: 'header', match: 'heading|paragraph', optional: true, greedy: true }] })`
- `transform`: iterate resolved sections, test each heading against pattern, selectively create tier tags or keep as-is

**Test**: `runes/marketing/test/tags/pricing.test.ts`

---

## Group C: Named Sections (Storytelling)

### Character (`runes/storytelling/src/tags/character.ts`)

**Current**: CharacterModel + StorySectionModel. headingsToList → section tags. Conditional output: sections exist → `refs: { portrait, sections }`; else → `refs: { portrait, body }`. Portrait image from preamble.

**Convert to**: `createContentModelSchema` with:
- `attributes`: `name` (required), `role`, `status`, `aliases`, `tags`
- `contentModel: (attrs) => ({ type: 'sections', sectionHeading: ..., emitTag: 'character-section', emitAttributes: { name: '$heading' }, fields: [{ name: 'portrait', match: 'image', optional: true }, { name: 'body', match: 'any', optional: true, greedy: true }], sectionModel: { type: 'sequence', fields: [{ name: 'body', match: 'any', optional: true, greedy: true }] } })`
- `transform`: check section count for conditional output

**Test**: `runes/storytelling/test/tags/character.test.ts`

### Realm (`runes/storytelling/src/tags/realm.ts`)

**Current**: Same pattern as character. RealmSectionModel. Scene image instead of portrait.

**Convert to**: Same approach as character with `emitTag: 'realm-section'`.

**Test**: `runes/storytelling/test/tags/realm.test.ts`

### Faction (`runes/storytelling/src/tags/faction.ts`)

**Current**: Same pattern, simpler (no image extraction). FactionSectionModel.

**Convert to**: Same approach with `emitTag: 'faction-section'`.

**Test**: `runes/storytelling/test/tags/faction.test.ts`

---

## Execution Order

1. **Phase 0**: Dynamic contentModel in `createContentModelSchema` + test
2. **Group A**: Accordion + Reveal (simplest, proves the pattern)
3. **Group C**: Character + Realm + Faction (similar pattern, done together)
4. **Group B**: Timeline, Changelog, Pricing (most complex)

Each conversion: modify schema file → run that rune's tests → verify pass.

---

## Key Utilities to Reuse

- `createContentModelSchema()` from `packages/runes/src/lib/index.ts:332`
- `pageSectionProperties()` from `packages/runes/src/tags/common.ts`
- `RenderableNodeCursor` from `packages/runes/src/tags/common.ts`
- `createComponentRenderable()` from `packages/runes/src/lib/component.ts`
- `asNodes()` from `packages/runes/src/lib/index.ts:18`
- `resolveContentModel()` / `resolveSections()` from `packages/runes/src/lib/resolver.ts`

---

## Verification

1. `npm run build` — zero TypeScript errors
2. `npm test` — all 1376+ tests pass
3. Each rune's existing test file passes without modification (the conversion must be behaviorally identical)

{% /work %}
